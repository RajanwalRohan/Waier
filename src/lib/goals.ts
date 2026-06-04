/**
 * Goals progress engine (pure).
 *
 * Computes how far a goal has come from its start value toward its target,
 * working in either direction (losing weight: start > target; gaining
 * strength: target > start). Progress is derived live from current data, never
 * stored, so it always reflects the latest readings.
 */

export type GoalType = "weight" | "strength_pr" | "distance" | "health_metric" | "habit_streak" | "custom";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Fractional progress (0-1) from start to target given the current value.
 * Direction-agnostic: works whether the target is above or below the start.
 * If start equals target, progress is 1 only when current has reached it.
 */
export function goalProgress(start: number, current: number, target: number): number {
  if (target === start) return current === target ? 1 : 0;
  const total = target - start;
  const done = current - start;
  return clamp01(done / total);
}

/** Whether the goal is met: current has reached or passed the target (either direction). */
export function isGoalComplete(start: number, current: number, target: number): boolean {
  if (target >= start) return current >= target;
  return current <= target;
}

export interface GoalView {
  start: number;
  current: number;
  target: number;
  progress: number; // 0-1
  complete: boolean;
  /** Remaining amount toward target (absolute, never negative). */
  remaining: number;
}

/** Build the full progress view for a goal. */
export function goalView(start: number, current: number, target: number): GoalView {
  const progress = goalProgress(start, current, target);
  const complete = isGoalComplete(start, current, target);
  const remaining = complete ? 0 : Math.abs(target - current);
  return { start, current, target, progress, complete, remaining };
}

/** Days remaining until a deadline (negative if past). Null when no deadline. */
export function daysUntil(deadline: Date | null): number | null {
  if (!deadline) return null;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setUTCHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
