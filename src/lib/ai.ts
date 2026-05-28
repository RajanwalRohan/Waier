import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { env } from "./env";

/**
 * AI provider configuration for the coaching chat feature.
 *
 * SECURITY NOTES:
 *  - The OPENAI_API_KEY is server-only (no NEXT_PUBLIC_ prefix).
 *  - User data sent to the AI provider is minimized — only fields relevant
 *    to coaching are included, and values are rounded / generalized.
 *  - Prompt input length is capped before being sent to the provider.
 *  - The system prompt establishes the AI's role and boundaries to reduce
 *    prompt-injection risk and off-topic abuse.
 */

const SYSTEM_PROMPT = `You are Wynn, the AI health and fitness coach inside the Waier app. You are powered by the Waer engine. Your personality is warm, knowledgeable, and motivating — like a trusted personal coach who genuinely cares about the user's wellbeing.

Your role is to:
- Provide personalized workout suggestions, recovery guidance, and habit coaching
- Offer evidence-based nutrition advice (you are NOT a doctor or dietitian)
- Interpret fitness metrics and health data to give actionable insights
- Motivate and encourage progress while being realistic
- Speak in a friendly, conversational tone — approachable but professional

IDENTITY:
- Your name is Wynn. If asked, you can mention you run on the Waer engine inside the Waier app.
- Never claim to be a human, doctor, or licensed professional.

BOUNDARIES:
- Never diagnose medical conditions or prescribe medication
- Always recommend consulting a healthcare professional for medical concerns
- Do not provide advice that could be dangerous (extreme fasting, unsafe exercises, etc.)
- Keep responses concise and actionable
- If asked about topics outside health/fitness/wellness, politely redirect the conversation`;

/** Maximum characters allowed in a single user message sent to the provider. */
const MAX_PROMPT_LENGTH = 4000;

/** Maximum number of conversation history messages to include for context. */
const MAX_HISTORY_MESSAGES = 20;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface UserCoachingContext {
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  sex?: string | null;
  fitnessGoal?: string | null;
  activityLevel?: string | null;
  dietaryPreferences?: string[];
  medicalConditions?: string[];
  foodAllergies?: string[];
  medicalNotes?: string | null;
}

/** Summary of a prior conversation, used to give Wynn cross-conversation memory. */
export interface PriorConversationSummary {
  title?: string | null;
  // Short excerpt — last few messages compressed down to their gist.
  excerpt: string;
  updatedAt: Date;
}

/**
 * Build a system message that includes anonymized/minimized user context.
 * SECURITY: Only include fields relevant to coaching. Round numeric values
 * to reduce identifiability if logs are ever exposed.
 */
export function buildSystemMessage(
  context?: UserCoachingContext | null,
  priorConversations?: PriorConversationSummary[],
): string {
  const parts: string[] = [SYSTEM_PROMPT];

  if (context) {
    parts.push("\nUser context (for personalization):");
    if (context.age) parts.push(`- Age group: ${Math.floor(context.age / 5) * 5}s`);
    if (context.heightCm) parts.push(`- Height: ~${Math.round(context.heightCm)}cm`);
    if (context.weightKg) parts.push(`- Weight: ~${Math.round(context.weightKg)}kg`);
    if (context.sex) parts.push(`- Sex: ${context.sex}`);
    if (context.fitnessGoal) parts.push(`- Goal: ${context.fitnessGoal.replace(/_/g, " ")}`);
    if (context.activityLevel) parts.push(`- Activity level: ${context.activityLevel.replace(/_/g, " ")}`);
    if (context.dietaryPreferences?.length) {
      parts.push(`- Dietary preferences: ${context.dietaryPreferences.join(", ")}`);
    }
    if (context.medicalConditions?.length) {
      parts.push(`- Known medical conditions: ${context.medicalConditions.join(", ")}`);
      parts.push("  (Tailor advice to account for these conditions. Be cautious and recommend consulting their doctor for condition-specific guidance.)");
    }
    if (context.foodAllergies?.length) {
      parts.push(`- Food allergies: ${context.foodAllergies.join(", ")}`);
      parts.push("  (IMPORTANT: Never suggest foods containing these allergens. Always consider these allergies when recommending meals or nutrition plans.)");
    }
    if (context.medicalNotes) {
      parts.push(`- Health notes: ${context.medicalNotes}`);
    }
  }

  if (priorConversations?.length) {
    parts.push(
      "\nMemory from prior conversations with this user (use to maintain continuity and remember context across sessions):",
    );
    for (const conv of priorConversations) {
      const when = conv.updatedAt.toISOString().slice(0, 10);
      const label = conv.title && conv.title !== "New conversation" ? conv.title : "Earlier chat";
      parts.push(`- [${when}] ${label}: ${conv.excerpt}`);
    }
  }

  return parts.join("\n");
}

export interface StreamCoachingOptions {
  userContext?: UserCoachingContext | null;
  priorConversations?: PriorConversationSummary[];
  /** Called once the stream completes with the full assistant text. */
  onFinish?: (finalText: string) => void | Promise<void>;
}

/**
 * Stream an AI coaching response.
 * Returns a ReadableStream suitable for the Vercel AI SDK's streaming protocol.
 */
export async function streamCoachingResponse(
  messages: ChatMessage[],
  options: StreamCoachingOptions = {},
) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("AI provider is not configured");
  }

  // Cap history length to control cost and context window
  const trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  // Enforce per-message length limit
  const safeMsgs = trimmedMessages.map((m) => ({
    role: m.role,
    content: m.content.slice(0, MAX_PROMPT_LENGTH),
  }));

  const systemMessage = buildSystemMessage(options.userContext, options.priorConversations);

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: systemMessage,
    messages: safeMsgs,
    maxTokens: 1024,
    temperature: 0.7,
    onFinish: options.onFinish
      ? async ({ text }) => {
          try {
            await options.onFinish!(text);
          } catch {
            // Never let persistence errors tear down the stream response.
          }
        }
      : undefined,
  });

  return result.toDataStreamResponse();
}
