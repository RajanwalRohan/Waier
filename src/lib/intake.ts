/**
 * Intake helpers (pure): hydration aggregation and modifier grouping.
 *
 * Hydration and modifiers are tracked for the user's awareness and for Wynn's
 * correlations, but never scored into Flow.
 */

export const DEFAULT_HYDRATION_GOAL_ML = 2500;

/** Common quick-add water amounts, in mL. */
export const HYDRATION_QUICK_ADD_ML = [250, 500, 750] as const;

export function sumHydrationMl(logs: Array<{ amountMl: number }>): number {
  return logs.reduce((s, l) => s + (l.amountMl || 0), 0);
}

/** Progress toward the daily goal, 0-100 (clamped). */
export function hydrationProgress(totalMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0;
  return Math.max(0, Math.min(100, (totalMl / goalMl) * 100));
}

/** mL to a friendly display string (e.g. 1500 -> "1.5 L", 250 -> "250 mL"). */
export function formatMl(ml: number): string {
  if (ml >= 1000) return `${(Math.round(ml / 100) / 10).toString()} L`;
  return `${Math.round(ml)} mL`;
}

export type ModifierKind = "caffeine" | "alcohol" | "supplement" | "sleep_aid";

/** Count modifiers by kind, e.g. { caffeine: 3, alcohol: 1 }. */
export function countModifiersByKind(mods: Array<{ kind: string }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of mods) out[m.kind] = (out[m.kind] ?? 0) + 1;
  return out;
}

/** Sum a modifier amount across entries of one kind (e.g. total caffeine mg today). */
export function sumModifierAmount(mods: Array<{ kind: string; amount: number | null }>, kind: string): number {
  return mods.filter((m) => m.kind === kind).reduce((s, m) => s + (m.amount ?? 0), 0);
}
