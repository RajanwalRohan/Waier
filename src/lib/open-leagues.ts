/**
 * Open Leagues engine (pure).
 *
 * Anonymous weekly cohorts ranked by League Points (LP). LP rewards both
 * absolute verified output and week-over-week improvement, so a fast-improving
 * beginner can out-earn a plateaued veteran (PRD 9.3):
 *
 *   LP = VerifiedActivityPoints + ImprovementMultiplier * max(0, BaselineDelta)
 *
 * The top third of a cohort promote, the bottom third demote, each week.
 */

export const IMPROVEMENT_MULTIPLIER = 1.5;

/** Weighted verified-activity points for a week. */
export function activityPoints(steps: number, activeCalories: number, workouts: number): number {
  return steps / 1000 + activeCalories / 100 + workouts * 50;
}

/** League Points: absolute output plus rewarded improvement. */
export function computeLP(points: number, improvementDelta: number, multiplier = IMPROVEMENT_MULTIPLIER): number {
  return Math.round(points + multiplier * Math.max(0, improvementDelta));
}

export type Zone = "promote" | "hold" | "demote";

/** Promotion/demotion zone for a 1-based rank within a cohort of `total`. */
export function rankZone(rank: number, total: number): Zone {
  if (total < 3) return "hold";
  const promoteCount = Math.ceil(total / 3);
  const demoteCount = Math.floor(total / 3);
  if (rank <= promoteCount) return "promote";
  if (rank > total - demoteCount) return "demote";
  return "hold";
}

/** ISO-8601 week key, e.g. "2026-W23". Cohorts are bucketed by this. */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // Thursday of this ISO week
  const year = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** The [Monday, next Monday) UTC range containing `date`. */
export function weekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(d);
  start.setUTCDate(start.getUTCDate() - dayNum);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}
