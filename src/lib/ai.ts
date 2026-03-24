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

const SYSTEM_PROMPT = `You are a knowledgeable, supportive health and fitness coach. Your role is to:
- Provide personalized workout suggestions, recovery guidance, and habit coaching
- Offer evidence-based nutrition advice (you are NOT a doctor or dietitian)
- Interpret fitness metrics and health data to give actionable insights
- Motivate and encourage progress while being realistic

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
}

/**
 * Build a system message that includes anonymized/minimized user context.
 * SECURITY: Only include fields relevant to coaching. Round numeric values
 * to reduce identifiability if logs are ever exposed.
 */
export function buildSystemMessage(context?: UserCoachingContext | null): string {
  if (!context) return SYSTEM_PROMPT;

  const parts: string[] = [SYSTEM_PROMPT, "\nUser context (for personalization):"];

  if (context.age) parts.push(`- Age group: ${Math.floor(context.age / 5) * 5}s`);
  if (context.heightCm) parts.push(`- Height: ~${Math.round(context.heightCm)}cm`);
  if (context.weightKg) parts.push(`- Weight: ~${Math.round(context.weightKg)}kg`);
  if (context.sex) parts.push(`- Sex: ${context.sex}`);
  if (context.fitnessGoal) parts.push(`- Goal: ${context.fitnessGoal.replace(/_/g, " ")}`);
  if (context.activityLevel) parts.push(`- Activity level: ${context.activityLevel.replace(/_/g, " ")}`);
  if (context.dietaryPreferences?.length) {
    parts.push(`- Dietary preferences: ${context.dietaryPreferences.join(", ")}`);
  }

  return parts.join("\n");
}

/**
 * Stream an AI coaching response.
 * Returns a ReadableStream suitable for the Vercel AI SDK's streaming protocol.
 */
export async function streamCoachingResponse(
  messages: ChatMessage[],
  userContext?: UserCoachingContext | null,
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

  const systemMessage = buildSystemMessage(userContext);

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: systemMessage,
    messages: safeMsgs,
    maxTokens: 1024,
    temperature: 0.7,
  });

  return result.toDataStreamResponse();
}
