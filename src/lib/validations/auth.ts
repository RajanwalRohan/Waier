import { z } from "zod";
import { emailSchema, passwordSchema, safeString } from "./common";

export const signupSchema = z.object({
  // Step 1
  name: safeString(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  email: emailSchema,
  password: passwordSchema,
  // Step 2
  sex: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  heightCm: z.number().min(50).max(300),
  weightKg: z.number().min(20).max(500),
  activityLevel: z.enum(["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"]),
  fitnessGoal: z.enum(["lose_weight", "gain_muscle", "maintain", "improve_endurance", "general_health"]).optional(),
  unitSystem: z.enum(["imperial", "metric"]).optional(),
  medicalConditions: z.array(z.string().max(100)).max(20),
  foodAllergies: z.array(z.string().max(100)).max(20).optional(),
  medicalNotes: z.string().max(2000).optional(),
  // Step 3 — Goal setting
  fitnessGoals: z.array(z.enum([
    "lose_weight", "gain_muscle", "clean_bulk", "clean_cut",
    "build_strength", "mobility", "improve_endurance", "general_health",
  ])).max(8).optional(),
  dietType: z.enum(["omnivore", "vegetarian", "vegan", "pescatarian", "keto", "paleo", "mediterranean", "whole30"]).optional(),
  exercisePreferences: z.array(z.enum([
    "running", "walking", "jogging", "weight_lifting", "calisthenics",
    "pilates", "yoga", "swimming", "cycling", "hiit", "boxing",
    "martial_arts", "dancing", "rock_climbing", "rowing",
  ])).max(15).optional(),
  exerciseDaysPerWeek: z.number().int().min(0).max(7).optional(),
  dailyStepsGoal: z.number().int().min(1000).max(100000).optional(),
  sleepGoalHours: z.number().min(4).max(14).optional(),
  goalWeightKg: z.number().min(20).max(500).optional(),
  calorieGoal: z.number().int().min(500).max(10000).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required").max(512),
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
