import { z } from "zod";
import { safeString } from "./common";

const sexEnum = z.enum(["male", "female", "other", "prefer_not_to_say"]);

const fitnessGoalEnum = z.enum([
  "lose_weight",
  "gain_muscle",
  "maintain",
  "improve_endurance",
  "general_health",
]);

const activityLevelEnum = z.enum([
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extremely_active",
]);

const dietaryPreferenceEnum = z.enum([
  "vegan",
  "vegetarian",
  "pescatarian",
  "keto",
  "paleo",
  "gluten_free",
  "dairy_free",
  "halal",
  "kosher",
  "none",
]);

/**
 * Profile update schema.
 * SECURITY:
 *  - Only explicitly listed fields are accepted (strict).
 *  - Age, height, weight have safe numeric ranges.
 *  - Enums prevent unexpected values in sex, goal, activity, diet fields.
 *  - No mass-assignment: userId is NEVER accepted from the request body.
 */
export const updateProfileSchema = z
  .object({
    age: z.number().int().min(13).max(120).nullish(),
    heightCm: z.number().min(50).max(300).nullish(),
    weightKg: z.number().min(20).max(500).nullish(),
    sex: sexEnum.nullish(),
    fitnessGoal: fitnessGoalEnum.nullish(),
    activityLevel: activityLevelEnum.nullish(),
    dietaryPreferences: z.array(dietaryPreferenceEnum).max(5).optional(),
    name: safeString(100).optional(),
  })
  .strict(); // Reject any field not listed above

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
