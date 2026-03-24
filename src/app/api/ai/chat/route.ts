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
import { streamCoachingResponse } from "@/lib/ai";
import type { UserCoachingContext } from "@/lib/ai";

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
        }
      : null;

    // Persist the user message if a conversation exists
    if (data.conversationId) {
      // Verify ownership of the conversation
      const conv = await db.aIConversation.findUnique({
        where: { id: data.conversationId },
        select: { userId: true },
      });
      if (conv && conv.userId === session.user.id) {
        await db.aIMessage.create({
          data: {
            conversationId: data.conversationId,
            role: "user",
            content: data.message,
          },
        });
      }
    }

    // Stream the response from the AI provider
    return streamCoachingResponse(messages, userContext);
  } catch (err) {
    return handleApiError(err);
  }
}
