/**
 * Flow scoring engine (pure functions).
 *
 * No I/O, no DB, no dates. Everything here is deterministic math on numeric
 * inputs so it is trivially testable and auditable. The PRD's worked examples
 * are reproduced verbatim in src/__tests__/flow.test.ts.
 */

import type { Grade } from "../metric-grading";
import {
  GRADE_SCORE,
  SUBMETRIC_BLEND,
  PILLAR_WEIGHTS,
  EMA_ALPHA,
  STREAK_TAU,
  CONSISTENCY_SUBWEIGHTS,
} from "./constants";

/** Map a 4-tier clinical grade to its 0-100 anchor. */
export function absoluteScore(grade: Grade): number {
  return GRADE_SCORE[grade];
}

/**
 * Blend an absolute/clinical score (0-100) with a peer percentile (0-100).
 * Clinical health is weighted higher than relative standing (honest first).
 */
export function blendSubMetric(absolute: number, percentile: number): number {
  return SUBMETRIC_BLEND.absolute * clamp01to100(absolute) + SUBMETRIC_BLEND.percentile * clamp01to100(percentile);
}

/** One sub-metric contributing to a pillar. A null value is treated as missing. */
export interface SubMetric {
  value: number | null;
  weight: number;
}

/**
 * Weighted average of a pillar's sub-metrics, redistributing weight across the
 * present sub-metrics when some are missing. Returns null if nothing is present
 * (caller decides how to handle a fully-empty pillar).
 */
export function weightedPillar(parts: SubMetric[]): number | null {
  const present = parts.filter((p): p is { value: number; weight: number } => p.value !== null);
  if (present.length === 0) return null;
  const totalWeight = present.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight === 0) return null;
  return present.reduce((sum, p) => sum + p.value * (p.weight / totalWeight), 0);
}

/** The five pillar scores (each 0-100) that compose Flow. */
export interface Pillars {
  heart: number;
  motion: number;
  recovery: number;
  fuel: number;
  consistency: number;
}

/**
 * Compute the daily raw Flow (0-1000) from the five pillars (each 0-100).
 *   RawFlow = 10 * weighted-average-of-pillars
 */
export function computeRawFlow(p: Pillars): number {
  const weightedAvg =
    PILLAR_WEIGHTS.heart * p.heart +
    PILLAR_WEIGHTS.motion * p.motion +
    PILLAR_WEIGHTS.recovery * p.recovery +
    PILLAR_WEIGHTS.fuel * p.fuel +
    PILLAR_WEIGHTS.consistency * p.consistency;
  return weightedAvg * 10;
}

/** Clamp a raw score to the displayed integer 0-1000 (floored to match published examples). */
export function displayFlow(raw: number): number {
  return Math.max(0, Math.min(1000, Math.floor(raw)));
}

/**
 * Apply exponential moving-average smoothing.
 * On the first day (no prior Flow) the raw score is used as-is.
 */
export function applyEma(rawToday: number, flowYesterday: number | null): number {
  if (flowYesterday === null || flowYesterday === undefined) return rawToday;
  return EMA_ALPHA * rawToday + (1 - EMA_ALPHA) * flowYesterday;
}

/**
 * Saturating streak score (0-100). Longer is always better but with
 * diminishing marginal gains: ~63 at 30 days, ~95 at 90 days.
 *   StreakScore(d) = 100 * (1 - e^(-d / tau))
 */
export function streakScore(days: number): number {
  if (days <= 0) return 0;
  return 100 * (1 - Math.exp(-days / STREAK_TAU));
}

/**
 * The Consistency pillar combines Orb completion rate (0-100, percent of the
 * last 30 days the Orb was filled) with the meal and workout streak scores.
 */
export function consistencyPillar(
  orbCompletionRate: number,
  mealStreakDays: number,
  workoutStreakDays: number,
): number {
  return (
    CONSISTENCY_SUBWEIGHTS.orbCompletion * clamp01to100(orbCompletionRate) +
    CONSISTENCY_SUBWEIGHTS.mealStreak * streakScore(mealStreakDays) +
    CONSISTENCY_SUBWEIGHTS.workoutStreak * streakScore(workoutStreakDays)
  );
}

function clamp01to100(v: number): number {
  return Math.max(0, Math.min(100, v));
}
