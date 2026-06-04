/**
 * Flow scoring constants.
 *
 * Flow is Waier's signature 0-1000 health score, composed of five pillars
 * (the Tributaries). All values here are the canonical source of truth for
 * the scoring engine and are referenced by the PRD (Appendix: Scoring
 * Constants). Changing a number here changes every user's score, so treat
 * this file as load-bearing.
 */

import type { Grade } from "../metric-grading";

/** Pillar weights in the headline Flow score. Sum to 1.0. */
export const PILLAR_WEIGHTS = {
  heart: 0.2,
  motion: 0.25,
  recovery: 0.2,
  fuel: 0.15,
  consistency: 0.2,
} as const;

/** Each sub-metric blends an absolute/clinical view with a peer-percentile view. */
export const SUBMETRIC_BLEND = { absolute: 0.65, percentile: 0.35 } as const;

/** Exponential moving average factor. ~1-week responsiveness. */
export const EMA_ALPHA = 0.25;

/** Saturating-streak time constant, in days. */
export const STREAK_TAU = 30;

/** Initial placement / calibration window before Flow is finalized. */
export const CALIBRATION_DAYS = 14;

/** Rolling window for continuously-updated personal baselines. */
export const BASELINE_WINDOW_DAYS = 30;

/**
 * Absolute/clinical grade to 0-100 anchor. The 4-tier grade from
 * metric-grading.ts maps onto these anchors (interpolated within a band by
 * callers that have the underlying value).
 */
export const GRADE_SCORE: Record<Grade, number> = {
  excellent: 90,
  good: 70,
  ok: 50,
  poor: 25,
};

// ── Intra-pillar sub-metric weights (each set sums to 1.0) ──

export const HEART_SUBWEIGHTS = { restingHr: 0.4, hrv: 0.35, vo2max: 0.25 } as const;
export const MOTION_SUBWEIGHTS = { activeCalories: 0.35, workoutLoad: 0.35, steps: 0.3 } as const;
export const RECOVERY_SUBWEIGHTS = { sleepDuration: 0.45, sleepConsistency: 0.3, overnightHrv: 0.25 } as const;
export const FUEL_SUBWEIGHTS = { loggingConsistency: 0.4, calorieAdherence: 0.35, proteinAdequacy: 0.25 } as const;
export const CONSISTENCY_SUBWEIGHTS = { orbCompletion: 0.4, mealStreak: 0.3, workoutStreak: 0.3 } as const;

/** A Flow rank tier. Scores outside any band clamp to the nearest. */
export interface Tier {
  name: string;
  min: number;
  max: number;
}

/**
 * The water-themed rank ladder. The climb is intentionally fast at the bottom
 * and hard at the top; that difficulty curve is intrinsic to the percentile
 * and clinical saturation, not enforced here. Thresholds are illustrative
 * starting points to be calibrated against real population data post-launch.
 */
export const TIERS: Tier[] = [
  { name: "Still", min: 0, max: 99 },
  { name: "Ripple", min: 100, max: 249 },
  { name: "Stream", min: 250, max: 424 },
  { name: "Rapid", min: 425, max: 599 },
  { name: "Surge", min: 600, max: 774 },
  { name: "Tidal", min: 775, max: 924 },
  { name: "Maelstrom", min: 925, max: 1000 },
];
