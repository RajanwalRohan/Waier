import { z } from "zod";
import { safeString, cuidSchema } from "./common";

const messageRoleEnum = z.enum(["user", "assistant"]);

const chatMessageSchema = z.object({
  role: messageRoleEnum,
  content: safeString(4000),
});

/**
 * AI chat request schema.
 * SECURITY:
 *  - Message content is capped at 4000 chars to prevent cost abuse.
 *  - History limited to 50 messages — the AI module further caps to 20
 *    when building the actual provider request.
 *  - conversationId is validated as a CUID to prevent injection.
 *  - Only "user" and "assistant" roles are accepted — "system" is never
 *    user-controlled (it is built server-side).
 */
export const aiChatSchema = z
  .object({
    message: safeString(4000),
    conversationId: cuidSchema.optional(),
    history: z.array(chatMessageSchema).max(50).optional(),
  })
  .strict();

export type AIChatInput = z.infer<typeof aiChatSchema>;
