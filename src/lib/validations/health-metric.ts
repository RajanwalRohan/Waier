import { z } from "zod";

const metricTypeEnum = z.enum([
  "steps",
  "heart_rate",
  "sleep_hours",
  "calories_burned",
  "blood_oxygen",
  "respiratory_rate",
  "hrv",
  "weight",
]);

/** Allowed units per metric type. */
const unitEnum = z.enum([
  "count",      // steps
  "bpm",        // heart_rate, hrv
  "hours",      // sleep_hours
  "kcal",       // calories_burned
  "percent",    // blood_oxygen
  "brpm",       // respiratory_rate (breaths per minute)
  "kg",         // weight
  "lbs",        // weight (alt)
]);

const sourceEnum = z.enum([
  "manual",
  "fitbit",
  "apple_health",
  "garmin",
  "google_fit",
]).default("manual");

/**
 * Health metric submission schema.
 * SECURITY:
 *  - Value ranges are constrained to prevent obviously bogus entries.
 *  - Source is an enum — no arbitrary strings.
 *  - userId is NEVER taken from the body.
 */
export const createHealthMetricSchema = z
  .object({
    type: metricTypeEnum,
    value: z.number().min(0).max(1_000_000),
    unit: unitEnum,
    source: sourceEnum,
    date: z.coerce.date(),
  })
  .strict();

export const healthMetricQuerySchema = z.object({
  type: metricTypeEnum.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateHealthMetricInput = z.infer<typeof createHealthMetricSchema>;
