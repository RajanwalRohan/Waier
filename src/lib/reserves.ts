/**
 * Reserves: a 0-100 recovery-readiness score.
 *
 * Higher means better recovered and more ready to train. It blends four
 * signals: sleep, HRV, resting heart rate, and recent training load (recent
 * hard training lowers readiness, the way Whoop's recovery does). Pure and
 * deterministic; the caller supplies HRV/resting-HR as pre-graded 0-100
 * scores (grading lives in metric-grading.ts) and raw sleep/load inputs.
 */

export const RESERVES_WEIGHTS = { sleep: 0.35, hrv: 0.3, restingHr: 0.2, load: 0.15 } as const;

export interface ReservesComponents {
  sleep: number | null;
  hrv: number | null;
  restingHr: number | null;
  load: number | null;
}

export interface ReservesResult {
  score: number;
  components: ReservesComponents;
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Sleep readiness: last night's hours against the goal (8h default). */
export function sleepReadiness(hours: number, goalHours = 8): number {
  if (goalHours <= 0) return 0;
  return clamp((hours / goalHours) * 100);
}

/**
 * Training-load readiness. More hard sessions in the last 2 days means less
 * recovery headroom, so readiness from this component drops.
 *   0 sessions -> 100, 1 -> 60, 2 -> 20, 3+ -> 0
 */
export function loadReadiness(recentSessions: number): number {
  return clamp(100 - recentSessions * 40);
}

/**
 * Blend the four components into a 0-100 score, redistributing weight across
 * the present components when some are missing.
 */
export function blendReserves(c: ReservesComponents): number {
  const parts: Array<{ value: number; weight: number }> = [];
  if (c.sleep !== null) parts.push({ value: clamp(c.sleep), weight: RESERVES_WEIGHTS.sleep });
  if (c.hrv !== null) parts.push({ value: clamp(c.hrv), weight: RESERVES_WEIGHTS.hrv });
  if (c.restingHr !== null) parts.push({ value: clamp(c.restingHr), weight: RESERVES_WEIGHTS.restingHr });
  if (c.load !== null) parts.push({ value: clamp(c.load), weight: RESERVES_WEIGHTS.load });
  if (parts.length === 0) return 0;
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  return parts.reduce((s, p) => s + p.value * (p.weight / totalWeight), 0);
}

export interface ReservesInputs {
  sleepHours: number | null;
  sleepGoalHours?: number;
  /** Pre-graded HRV score (0-100), higher = better. Null if no HRV data. */
  hrvScore: number | null;
  /** Pre-graded resting-HR score (0-100), higher = better. Null if no data. */
  restingHrScore: number | null;
  /** Number of workout sessions in the last 2 days. */
  recentSessions: number;
  /** Whether any training data exists at all (controls whether load counts). */
  hasTrainingData: boolean;
}

/** Compute Reserves from raw inputs, producing the score and its components. */
export function computeReserves(input: ReservesInputs): ReservesResult {
  const components: ReservesComponents = {
    sleep: input.sleepHours === null ? null : sleepReadiness(input.sleepHours, input.sleepGoalHours ?? 8),
    hrv: input.hrvScore,
    restingHr: input.restingHrScore,
    load: input.hasTrainingData ? loadReadiness(input.recentSessions) : null,
  };
  return { score: blendReserves(components), components };
}

/** Map a Reserves score to a short readiness label. */
export function reservesLabel(score: number): string {
  if (score >= 75) return "Primed";
  if (score >= 55) return "Ready";
  if (score >= 35) return "Moderate";
  return "Run down";
}
