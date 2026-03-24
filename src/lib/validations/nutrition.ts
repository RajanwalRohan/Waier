import { z } from "zod";
import { safeString, cuidSchema } from "./common";

const mealTypeEnum = z.enum(["breakfast", "lunch", "dinner", "snack"]);

/**
 * Create meal schema.
 * SECURITY:
 *  - Strict mode rejects unexpected fields.
 *  - Calorie / macro values capped to sane maximums.
 *  - Description length-limited to prevent payload abuse.
 *  - userId is NEVER taken from the body.
 */
export const createMealSchema = z
  .object({
    name: safeString(200),
    description: safeString(2000).optional(),
    calories: z.number().min(0).max(50000).nullish(),
    proteinG: z.number().min(0).max(5000).nullish(),
    carbsG: z.number().min(0).max(5000).nullish(),
    fatG: z.number().min(0).max(5000).nullish(),
    fiberG: z.number().min(0).max(1000).nullish(),
    mealType: mealTypeEnum.nullish(),
    imageUrl: z.string().url().max(2048).nullish(),
    date: z.coerce.date(),
  })
  .strict();

export const updateMealSchema = z
  .object({
    name: safeString(200).optional(),
    description: safeString(2000).optional(),
    calories: z.number().min(0).max(50000).nullish(),
    proteinG: z.number().min(0).max(5000).nullish(),
    carbsG: z.number().min(0).max(5000).nullish(),
    fatG: z.number().min(0).max(5000).nullish(),
    fiberG: z.number().min(0).max(1000).nullish(),
    mealType: mealTypeEnum.nullish(),
    imageUrl: z.string().url().max(2048).nullish(),
    date: z.coerce.date().optional(),
  })
  .strict();

export const mealIdSchema = z.object({
  id: cuidSchema,
});

export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
