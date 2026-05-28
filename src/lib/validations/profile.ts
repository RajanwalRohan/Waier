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

const fitnessGoalMultiEnum = z.enum([
  "lose_weight",
  "gain_muscle",
  "clean_bulk",
  "clean_cut",
  "build_strength",
  "mobility",
  "improve_endurance",
  "general_health",
]);

const dietTypeEnum = z.enum([
  "omnivore",
  "vegetarian",
  "vegan",
  "pescatarian",
  "keto",
  "paleo",
  "mediterranean",
  "whole30",
]);

const exercisePreferenceEnum = z.enum([
  "running",
  "walking",
  "jogging",
  "weight_lifting",
  "calisthenics",
  "pilates",
  "yoga",
  "swimming",
  "cycling",
  "hiit",
  "boxing",
  "martial_arts",
  "dancing",
  "rock_climbing",
  "rowing",
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

export const COMMON_CONDITIONS = [
  "Type 1 Diabetes",
  "Type 2 Diabetes",
  "Hypertension",
  "High Cholesterol",
  "Heart Disease",
  "Asthma",
  "Arthritis",
  "Crohn's Disease",
  "Celiac Disease",
  "Thyroid Disorder",
  "PCOS",
  "Anemia",
  "Osteoporosis",
  "Chronic Kidney Disease",
  "Food Allergies",
] as const;

export const COMMON_FOOD_ALLERGENS = [
  "Milk / Dairy",
  "Eggs",
  "Peanuts",
  "Tree Nuts",
  "Fish",
  "Shellfish",
  "Wheat / Gluten",
  "Soybeans",
  "Sesame",
] as const;

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
    medicalConditions: z.array(z.string().max(100)).max(20).optional(),
    foodAllergies: z.array(z.string().max(100)).max(20).optional(),
    medicalNotes: z.string().max(2000).nullish(),
    unitSystem: z.enum(["imperial", "metric"]).optional(),
    defaultRestSec: z.number().int().min(10).max(900).optional(),
    name: safeString(100).optional(),
    // Goal setting
    fitnessGoals: z.array(fitnessGoalMultiEnum).max(8).optional(),
    dietType: dietTypeEnum.nullish(),
    exercisePreferences: z.array(exercisePreferenceEnum).max(15).optional(),
    exerciseDaysPerWeek: z.number().int().min(0).max(7).nullish(),
    dailyStepsGoal: z.number().int().min(1000).max(100000).nullish(),
    sleepGoalHours: z.number().min(4).max(14).nullish(),
    goalWeightKg: z.number().min(20).max(500).nullish(),
    calorieGoal: z.number().int().min(500).max(10000).nullish(),
  })
  .strict(); // Reject any field not listed above

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
