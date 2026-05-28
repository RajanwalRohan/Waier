import { z } from "zod";

/**
 * Known metric types — used for label mapping and percentile calculations.
 * The validator accepts ANY lowercase snake_case string so new metric types
 * from wearables flow through without code changes.
 */
export const KNOWN_METRIC_TYPES = [
  "steps",
  "heart_rate",
  "resting_heart_rate",
  "sleep_hours",
  "calories_burned",
  "active_calories",
  "blood_oxygen",
  "respiratory_rate",
  "hrv",
  "weight",
  "skin_temperature",
  "blood_pressure_systolic",
  "blood_pressure_diastolic",
  "blood_glucose",
  "vo2_max",
  "body_fat_percentage",
  "distance",
  "floors_climbed",
  "stress_level",
  "body_battery",
] as const;

/** Accept any lowercase snake_case identifier so wearables can send new types. */
const metricTypeValidator = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z][a-z0-9_]*$/, "Must be lowercase snake_case");

/** Accept any short unit string — wearables send diverse units. */
const unitValidator = z.string().min(1).max(20);

const sourceEnum = z
  .enum([
    "manual",
    "fitbit",
    "apple_health",
    "garmin",
    "google_fit",
    "samsung_health",
    "whoop",
    "polar",
    "suunto",
    "oura",
    "open_wearables",
  ])
  .default("manual");

/**
 * Health metric submission schema.
 * SECURITY:
 *  - Value ranges are constrained to prevent obviously bogus entries.
 *  - Source is an enum — no arbitrary strings.
 *  - userId is NEVER taken from the body.
 */
export const createHealthMetricSchema = z
  .object({
    type: metricTypeValidator,
    value: z.number().min(0).max(1_000_000),
    unit: unitValidator,
    source: sourceEnum,
    date: z.coerce.date(),
  })
  .strict();

export const healthMetricQuerySchema = z.object({
  type: metricTypeValidator.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateHealthMetricInput = z.infer<typeof createHealthMetricSchema>;
