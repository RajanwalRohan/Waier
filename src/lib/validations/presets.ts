import { z } from "zod";
import { safeString, cuidSchema } from "./common";

const presetExerciseSchema = z.object({
  name: safeString(200),
  sets: z.number().int().min(0).max(200).nullish(),
  reps: z.number().int().min(0).max(10000).nullish(),
  weightKg: z.number().min(0).max(1000).nullish(),
  durationSec: z.number().int().min(0).max(86400).nullish(),
  notes: safeString(500).optional(),
  order: z.number().int().min(0).max(100).default(0),
});

/** Array of weekday integers (0=Sun … 6=Sat), unique, bounded. */
const recurringDaysSchema = z
  .array(z.number().int().min(0).max(6))
  .max(7)
  .transform((arr) => Array.from(new Set(arr)).sort((a, b) => a - b));

export const createWorkoutPresetSchema = z
  .object({
    name: safeString(100),
    recurringDays: recurringDaysSchema.default([]),
    exercises: z.array(presetExerciseSchema).max(50).default([]),
  })
  .strict();

export const updateWorkoutPresetSchema = z
  .object({
    name: safeString(100).optional(),
    recurringDays: recurringDaysSchema.optional(),
    exercises: z.array(presetExerciseSchema).max(50).optional(),
  })
  .strict();

const mealTypeEnum = z.enum(["breakfast", "lunch", "dinner", "snack"]);

export const createMealPresetSchema = z
  .object({
    name: safeString(100),
    description: safeString(500).optional(),
    mealType: mealTypeEnum.nullish(),
    calories: z.number().min(0).max(20000).nullish(),
    proteinG: z.number().min(0).max(2000).nullish(),
    carbsG: z.number().min(0).max(5000).nullish(),
    fatG: z.number().min(0).max(2000).nullish(),
    fiberG: z.number().min(0).max(1000).nullish(),
  })
  .strict();

export const updateMealPresetSchema = createMealPresetSchema.partial();

export const presetIdSchema = z.object({ id: cuidSchema });

export type CreateWorkoutPresetInput = z.infer<typeof createWorkoutPresetSchema>;
export type UpdateWorkoutPresetInput = z.infer<typeof updateWorkoutPresetSchema>;
export type CreateMealPresetInput = z.infer<typeof createMealPresetSchema>;
export type UpdateMealPresetInput = z.infer<typeof updateMealPresetSchema>;
