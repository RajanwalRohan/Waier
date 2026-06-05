/**
 * Server-side category computation for Championship League matchups.
 * Computes each member's value per category over a period window, from real
 * logged data. Only verified-friendly, non-sensitive categories are used.
 */

import { db } from "./db";

export const DEFAULT_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: "steps", label: "Steps" },
  { key: "active_calories", label: "Active calories" },
  { key: "workouts_logged", label: "Workouts" },
  { key: "meals_logged", label: "Meals logged" },
];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_CATEGORIES.map((c) => [c.key, c.label]),
);

const METRIC_KEYS = new Set(["steps", "active_calories"]);

/** Map of userId -> { categoryKey: value } over [start, end). */
export async function computeCategoryValues(
  memberIds: string[],
  start: Date,
  end: Date,
  keys: string[],
): Promise<Map<string, Record<string, number>>> {
  const result = new Map<string, Record<string, number>>();
  for (const id of memberIds) result.set(id, {});
  if (memberIds.length === 0) return result;

  const metricKeys = keys.filter((k) => METRIC_KEYS.has(k));
  const wantWorkouts = keys.includes("workouts_logged");
  const wantMeals = keys.includes("meals_logged");

  const [metrics, workouts, meals] = await Promise.all([
    metricKeys.length
      ? db.healthMetric.findMany({
          where: { userId: { in: memberIds }, type: { in: metricKeys }, date: { gte: start, lt: end } },
          select: { userId: true, type: true, value: true },
        })
      : Promise.resolve([]),
    wantWorkouts
      ? db.workout.groupBy({ by: ["userId"], where: { userId: { in: memberIds }, date: { gte: start, lt: end } }, _count: { _all: true } })
      : Promise.resolve([] as Array<{ userId: string; _count: { _all: number } }>),
    wantMeals
      ? db.meal.groupBy({ by: ["userId"], where: { userId: { in: memberIds }, date: { gte: start, lt: end } }, _count: { _all: true } })
      : Promise.resolve([] as Array<{ userId: string; _count: { _all: number } }>),
  ]);

  for (const m of metrics) {
    const r = result.get(m.userId);
    if (r) r[m.type] = (r[m.type] ?? 0) + m.value;
  }
  for (const w of workouts) {
    const r = result.get(w.userId);
    if (r) r["workouts_logged"] = w._count._all;
  }
  for (const m of meals) {
    const r = result.get(m.userId);
    if (r) r["meals_logged"] = m._count._all;
  }

  // Default any missing category to 0 so matchups always have both values.
  for (const id of memberIds) {
    const r = result.get(id)!;
    for (const k of keys) if (r[k] === undefined) r[k] = 0;
  }
  return result;
}
