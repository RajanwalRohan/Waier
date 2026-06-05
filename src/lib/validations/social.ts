import { z } from "zod";

export const setUsernameSchema = z.object({
  username: z.string().min(3).max(20),
});

export const privacySchema = z
  .object({
    showFlow: z.boolean(),
    showStreaks: z.boolean(),
    showStats: z.boolean(),
    showPillars: z.boolean(),
  })
  .partial();

export const friendRequestSchema = z.object({
  username: z.string().min(1).max(30),
});

export const friendActionSchema = z.object({
  id: z.string().min(1).max(40),
  action: z.enum(["accept", "decline"]),
});
