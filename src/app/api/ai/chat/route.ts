import { db } from "@/lib/db";
import { rateLimiters } from "@/lib/rate-limit";
import {
  errorResponse,
  rateLimitResponse,
  getClientIp,
  parseBody,
  handleApiError,
  requireAuthOrRespond,
} from "@/lib/api-utils";
import { aiChatSchema } from "@/lib/validations/ai-chat";
import { streamCoachingResponse, safetyStreamResponse } from "@/lib/ai";
import type { UserCoachingContext, PriorConversationSummary } from "@/lib/ai";
import { evaluateSafety } from "@/lib/wynn-safety";

/**
 * POST /api/ai/chat
 * Stream an AI coaching response.
 *
 * SECURITY:
 *  - Very strict rate limiting (ai tier: 20/min) to prevent cost abuse.
 *  - Input length capped at 4000 chars.
 *  - History capped at 50 messages.
 *  - User context is minimized before sending to the AI provider.
 *  - System prompt is server-controlled — never user-provided.
 *  - API key is server-side only.
 */

/** Max prior conversations to summarize into the system prompt for memory. */
const MEMORY_CONVERSATIONS = 5;
/** Max messages per prior conversation to use when building its excerpt. */
const MEMORY_MESSAGES_PER_CONVERSATION = 6;
/** Char budget for any one prior-conversation excerpt. */
const MEMORY_EXCERPT_CHARS = 400;

export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    // Dual rate limit: per-user AND per-IP
    const ip = getClientIp(request);
    const userRl = rateLimiters.ai.check(session.user.id);
    if (!userRl.success) return rateLimitResponse(userRl);
    const ipRl = rateLimiters.ai.check(`ip:${ip}`);
    if (!ipRl.success) return rateLimitResponse(ipRl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = aiChatSchema.parse(body);

    // Build conversation history
    const messages = [
      ...(data.history ?? []),
      { role: "user" as const, content: data.message },
    ];

    // Fetch minimized user context for personalization
    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        age: true,
        heightCm: true,
        weightKg: true,
        sex: true,
        fitnessGoal: true,
        activityLevel: true,
        dietaryPreferences: true,
        medicalConditions: true,
        foodAllergies: true,
        medicalNotes: true,
      },
    });

    const userContext: UserCoachingContext | null = profile
      ? {
          age: profile.age,
          heightCm: profile.heightCm,
          weightKg: profile.weightKg,
          sex: profile.sex,
          fitnessGoal: profile.fitnessGoal,
          activityLevel: profile.activityLevel,
          dietaryPreferences: JSON.parse(profile.dietaryPreferences || "[]"),
          medicalConditions: JSON.parse(profile.medicalConditions || "[]"),
          foodAllergies: JSON.parse(profile.foodAllergies || "[]"),
          medicalNotes: profile.medicalNotes,
        }
      : null;

    // Verify ownership of the active conversation, and capture its current
    // message count so we can auto-title on the first exchange.
    let activeConversationId: string | null = null;
    let activeConvIsEmpty = false;
    if (data.conversationId) {
      const conv = await db.aIConversation.findUnique({
        where: { id: data.conversationId },
        select: {
          userId: true,
          title: true,
          _count: { select: { messages: true } },
        },
      });
      if (conv && conv.userId === session.user.id) {
        activeConversationId = data.conversationId;
        activeConvIsEmpty = conv._count.messages === 0;
      }
    }

    // Persist the user message if a conversation exists
    if (activeConversationId) {
      await db.aIMessage.create({
        data: {
          conversationId: activeConversationId,
          role: "user",
          content: data.message,
        },
      });
    }

    // Build cross-conversation memory. Pull recent OTHER conversations for
    // this user and compress each into a short excerpt so Wynn has continuity
    // across sessions without blowing the token budget.
    const priorConversations: PriorConversationSummary[] = [];
    const priorConvs = await db.aIConversation.findMany({
      where: {
        userId: session.user.id,
        ...(activeConversationId ? { id: { not: activeConversationId } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: MEMORY_CONVERSATIONS,
      select: {
        title: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: MEMORY_MESSAGES_PER_CONVERSATION,
          select: { role: true, content: true },
        },
      },
    });
    for (const c of priorConvs) {
      if (!c.messages.length) continue;
      // Messages are newest-first; flip to chronological for readability.
      const ordered = [...c.messages].reverse();
      const joined = ordered
        .map((m) => `${m.role === "user" ? "User" : "Wynn"}: ${m.content}`)
        .join(" | ");
      const excerpt =
        joined.length > MEMORY_EXCERPT_CHARS
          ? joined.slice(0, MEMORY_EXCERPT_CHARS) + "…"
          : joined;
      priorConversations.push({ title: c.title, excerpt, updatedAt: c.updatedAt });
    }

    // SAFETY PROTOCOL: deterministic pre-LLM check. If the message indicates a
    // crisis or eating-disorder pattern, Wynn breaks character and returns a
    // fixed safe response with resources, without ever reaching the model.
    const safety = evaluateSafety(data.message, profile?.sex ?? null);
    if (safety.type && safety.message) {
      if (activeConversationId) {
        await db.aIMessage.create({
          data: { conversationId: activeConversationId, role: "assistant", content: safety.message },
        });
        await db.aIConversation.update({
          where: { id: activeConversationId },
          data: {
            updatedAt: new Date(),
            ...(activeConvIsEmpty
              ? { title: data.message.trim().replace(/\s+/g, " ").slice(0, 60) || "New conversation" }
              : {}),
          },
        });
      }
      return safetyStreamResponse(safety.message);
    }

    // Stream the response. When the stream finishes, persist the assistant
    // message, bump the conversation's updatedAt, and auto-title if this was
    // the first exchange.
    return streamCoachingResponse(messages, {
      userContext,
      priorConversations,
      onFinish: activeConversationId
        ? async (finalText) => {
            const trimmed = finalText.trim();
            if (!trimmed) return;
            await db.aIMessage.create({
              data: {
                conversationId: activeConversationId!,
                role: "assistant",
                content: trimmed,
              },
            });
            // Auto-title from the user's first message when the conversation
            // was previously empty and still carries the default title.
            const shouldTitle = activeConvIsEmpty;
            if (shouldTitle) {
              const title = data.message.trim().replace(/\s+/g, " ").slice(0, 60);
              await db.aIConversation.update({
                where: { id: activeConversationId! },
                data: {
                  title: title || "New conversation",
                  updatedAt: new Date(),
                },
              });
            } else {
              await db.aIConversation.update({
                where: { id: activeConversationId! },
                data: { updatedAt: new Date() },
              });
            }
          }
        : undefined,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
