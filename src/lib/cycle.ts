/**
 * Menstrual cycle engine (pure).
 *
 * From a history of period-start dates, derives average cycle length, predicts
 * the next period, and reports the current cycle day and phase. Uses the
 * standard model where the luteal phase is ~14 days, so ovulation falls about
 * 14 days before the next expected period.
 *
 * All cycle data is strict-tier private (Section 14): it is never used in
 * percentiles, leagues, or any shared surface.
 */

export type Phase = "menstrual" | "follicular" | "ovulatory" | "luteal";

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
const LUTEAL_LENGTH = 14;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function sortAsc(dates: Date[]): Date[] {
  return [...dates].sort((a, b) => a.getTime() - b.getTime());
}

/** Average cycle length (days) from consecutive period starts, or null if too few. */
export function averageCycleLength(periodStarts: Date[]): number | null {
  const sorted = sortAsc(periodStarts);
  if (sorted.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1], sorted[i]));
  return gaps.reduce((s, g) => s + g, 0) / gaps.length;
}

/** Predict the next period start from the most recent start and a cycle length. */
export function predictNextPeriod(periodStarts: Date[], cycleLength: number): Date | null {
  const sorted = sortAsc(periodStarts);
  if (sorted.length === 0) return null;
  const last = sorted[sorted.length - 1];
  const next = new Date(last);
  next.setUTCDate(next.getUTCDate() + Math.round(cycleLength));
  return next;
}

/** Current cycle day (1-based) and phase relative to the last period start. */
export function cyclePhase(
  lastStart: Date,
  today: Date,
  cycleLength: number = DEFAULT_CYCLE_LENGTH,
  periodLength: number = DEFAULT_PERIOD_LENGTH,
): { day: number; phase: Phase } {
  const day = daysBetween(lastStart, today) + 1; // start day is day 1
  const ovulation = Math.max(periodLength + 1, Math.round(cycleLength) - LUTEAL_LENGTH);

  let phase: Phase;
  if (day <= periodLength) phase = "menstrual";
  else if (day < ovulation - 1) phase = "follicular";
  else if (day <= ovulation + 1) phase = "ovulatory";
  else phase = "luteal";

  return { day, phase };
}

export interface CycleStats {
  cycleLength: number;
  estimated: boolean; // true when using the default (not enough history)
  lastStart: string | null; // ISO date
  nextPredicted: string | null; // ISO date
  daysUntilNext: number | null;
  day: number | null;
  phase: Phase | null;
}

/** Build a full cycle summary from period-start history relative to today. */
export function cycleStats(periodStarts: Date[], today: Date): CycleStats {
  const sorted = sortAsc(periodStarts);
  const avg = averageCycleLength(sorted);
  const cycleLength = avg ?? DEFAULT_CYCLE_LENGTH;
  const lastStart = sorted.length ? sorted[sorted.length - 1] : null;
  const next = predictNextPeriod(sorted, cycleLength);
  const phaseInfo = lastStart ? cyclePhase(lastStart, today, cycleLength) : null;

  return {
    cycleLength: Math.round(cycleLength),
    estimated: avg === null,
    lastStart: lastStart ? lastStart.toISOString().slice(0, 10) : null,
    nextPredicted: next ? next.toISOString().slice(0, 10) : null,
    daysUntilNext: next ? daysBetween(today, next) : null,
    day: phaseInfo?.day ?? null,
    phase: phaseInfo?.phase ?? null,
  };
}

const PHASE_LABELS: Record<Phase, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulatory: "Ovulatory",
  luteal: "Luteal",
};

export function phaseLabel(phase: Phase): string {
  return PHASE_LABELS[phase];
}
