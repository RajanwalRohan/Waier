/**
 * Wrapped: year-in-review aggregation (pure).
 *
 * Turns a year of Flow scores, workouts, meals, and totals into a shareable
 * summary. Deterministic and testable; the API supplies real data and the page
 * renders the cards.
 */

import { getRank } from "./flow/ranks";

export interface WrappedInput {
  year: number;
  flowSeries: Array<{ date: string; flow: number }>;
  totalWorkouts: number;
  totalMeals: number;
  totalDistanceKm: number;
  totalActiveCalories: number;
  longestStreak: number;
  pillarAverages: { heart: number | null; motion: number | null; recovery: number | null; fuel: number | null; consistency: number | null };
}

export interface WrappedSummary {
  year: number;
  hasData: boolean;
  flowPeak: number | null;
  peakRank: string | null;
  flowStart: number | null;
  flowLatest: number | null;
  flowGain: number | null;
  totalWorkouts: number;
  totalMeals: number;
  totalDistanceKm: number;
  totalActiveCalories: number;
  longestStreak: number;
  strongestPillar: string | null;
  strongestPillarScore: number | null;
}

const PILLAR_LABELS: Record<string, string> = {
  heart: "Heart",
  motion: "Motion",
  recovery: "Recovery",
  fuel: "Fuel",
  consistency: "Consistency",
};

export function buildWrapped(input: WrappedInput): WrappedSummary {
  const flows = input.flowSeries.map((s) => s.flow);
  const hasFlow = flows.length > 0;
  const flowPeak = hasFlow ? Math.max(...flows) : null;
  const flowStart = hasFlow ? input.flowSeries[0].flow : null;
  const flowLatest = hasFlow ? input.flowSeries[input.flowSeries.length - 1].flow : null;
  const flowGain = flowStart !== null && flowLatest !== null ? flowLatest - flowStart : null;

  // Strongest pillar by average.
  let strongestPillar: string | null = null;
  let strongestPillarScore: number | null = null;
  for (const [key, val] of Object.entries(input.pillarAverages)) {
    if (val === null) continue;
    if (strongestPillarScore === null || val > strongestPillarScore) {
      strongestPillarScore = val;
      strongestPillar = PILLAR_LABELS[key] ?? key;
    }
  }

  const hasData =
    hasFlow || input.totalWorkouts > 0 || input.totalMeals > 0 || input.totalDistanceKm > 0;

  return {
    year: input.year,
    hasData,
    flowPeak,
    peakRank: flowPeak !== null ? getRank(flowPeak).label : null,
    flowStart,
    flowLatest,
    flowGain,
    totalWorkouts: input.totalWorkouts,
    totalMeals: input.totalMeals,
    totalDistanceKm: Math.round(input.totalDistanceKm * 10) / 10,
    totalActiveCalories: Math.round(input.totalActiveCalories),
    longestStreak: input.longestStreak,
    strongestPillar,
    strongestPillarScore: strongestPillarScore !== null ? Math.round(strongestPillarScore) : null,
  };
}
