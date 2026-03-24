import { z } from "zod";
import { safeString, cuidSchema } from "./common";

const exerciseSchema = z.object({
  name: safeString(200),
  sets: z.number().int().min(0).max(200).nullish(),
  reps: z.number().int().min(0).max(10000).nullish(),
  weightKg: z.number().min(0).max(1000).nullish(),
  durationSec: z.number().int().min(0).max(86400).nullish(),
  notes: safeString(500).optional(),
  order: z.number().int().min(0).max(100).default(0),
});

/**
 * Create workout schema.
 * SECURITY:
 *  - Strict mode rejects unexpected fields (prevents mass-assignment).
 *  - Exercise array capped at 100 entries to prevent payload abuse.
 *  - All strings are sanitized and length-limited.
 *  - userId is NEVER accepted from the body — always taken from the session.
 */
export const createWorkoutSchema = z
  .object({
    name: safeString(200),
    notes: safeString(2000).optional(),
    durationMin: z.number().int().min(0).max(1440).nullish(),
    date: z.coerce.date(),
    exercises: z.array(exerciseSchema).max(100).default([]),
  })
  .strict();

export const updateWorkoutSchema = z
  .object({
    name: safeString(200).optional(),
    notes: safeString(2000).optional(),
    durationMin: z.number().int().min(0).max(1440).nullish(),
    date: z.coerce.date().optional(),
    exercises: z.array(exerciseSchema).max(100).optional(),
  })
  .strict();

export const workoutIdSchema = z.object({
  id: cuidSchema,
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
