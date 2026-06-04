import { z } from "zod";

export const createGoalSchema = z.object({
  type: z.enum(["weight", "strength_pr", "distance", "health_metric", "habit_streak", "custom"]),
  title: z.string().min(1).max(120),
  metricType: z.string().max(40).optional(),
  streakType: z.enum(["bubble", "meal", "workout"]).optional(),
  targetValue: z.number().finite(),
  targetUnit: z.string().max(20).optional(),
  startValue: z.number().finite().optional(),
  deadline: z.coerce.date().optional(),
});

export const updateGoalSchema = z.object({
  status: z.enum(["active", "paused", "completed", "abandoned"]),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
