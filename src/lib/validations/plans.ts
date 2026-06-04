import { z } from "zod";

export const createPlanSchema = z.object({
  kind: z.enum(["training", "nutrition"]),
  weeks: z.number().int().min(1).max(52),
  name: z.string().max(120).optional(),
  goalId: z.string().max(40).optional(),
});

export const updatePlanSchema = z.object({
  status: z.enum(["active", "paused", "completed", "archived"]),
});

export const togglePlanItemSchema = z.object({
  completed: z.boolean(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
