/**
 * Flow materialization.
 *
 * Turns a user's real logged data (health metrics, workouts, meals, Orb days)
 * into the five pillars and a Flow score, then upserts the DailyScore row and
 * refreshes personal baselines. This is the bridge between the pure scoring
 * engine (scoring.ts) and the database.
 *
 * v1 simplifications (documented intentionally, to be iterated):
 *  - Sub-metric scores use the absolute/clinical grade only. The peer-
 *    percentile half of the PRD blend is a follow-up that will read the
 *    existing percentile engine; the engine still weights clinical health
 *    highest, so an absolute-only score is honest, just less personalized.
 *  - Orb completion rate uses an engagement proxy (days with logged activity)
 *    until enough real OrbDay history accrues.
 */

import { db } from "@/lib/db";
import { getMetricGrade, type UserGoals } from "@/lib/metric-grading";
import {
  absoluteScore,
  computeRawFlow,
  displayFlow,
  applyEma,
  streakScore,
  consistencyPillar,
  weightedPillar,
  type Pillars,
} from "./scoring";
import { getRank } from "./ranks";
import {
  PILLAR_WEIGHTS,
  HEART_SUBWEIGHTS,
  MOTION_SUBWEIGHTS,
  RECOVERY_SUBWEIGHTS,
  FUEL_SUBWEIGHTS,
  CALIBRATION_DAYS,
  BASELINE_WINDOW_DAYS,
} from "./constants";

// ─── Small date helpers ───────────────────────────────────

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

// ─── Aggregation helpers ──────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stddev(values: number[], mu: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((s, v) => s + (v - mu) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Count consecutive qualifying days ending today (or yesterday if today is not yet logged). */
function consecutiveDays(qualifying: Set<string>): number {
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!qualifying.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1); // grace: streak survives until end of today
  }
  let count = 0;
  while (qualifying.has(dayKey(cursor))) {
    count += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}

// ─── Result shape ─────────────────────────────────────────

export interface FlowResult {
  flow: number;
  rawFlow: number;
  tier: string;
  division: number | null;
  label: string;
  calibrating: boolean;
  pillars: { heart: number | null; motion: number | null; recovery: number | null; fuel: number | null; consistency: number | null };
  streaks: { bubble: number; meal: number; workout: number };
  orb: { movePct: number; fuelPct: number; recoverPct: number; focusPct: number; filled: boolean };
}

/** Absolute clinical sub-score (0-100) for a metric value, or null if absent. */
function subScore(type: string, value: number | null, goals: UserGoals): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return absoluteScore(getMetricGrade(type, value, goals));
}

/**
 * Compute and persist a user's Flow for today. Idempotent: safe to call
 * repeatedly; it upserts the single DailyScore row for the current day.
 */
export async function materializeFlow(userId: string): Promise<FlowResult> {
  const since7 = daysAgo(7);
  const since30 = daysAgo(BASELINE_WINDOW_DAYS);
  const since60 = daysAgo(60);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [profile, metrics, workouts, meals, priorScore] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    db.healthMetric.findMany({
      where: { userId, date: { gte: since30 } },
      select: { type: true, value: true, date: true },
    }),
    db.workout.findMany({ where: { userId, date: { gte: since60 } }, select: { date: true } }),
    db.meal.findMany({
      where: { userId, date: { gte: since60 } },
      select: { calories: true, proteinG: true, date: true },
    }),
    db.dailyScore.findFirst({
      where: { userId, date: { lt: today } },
      orderBy: { date: "desc" },
    }),
  ]);

  const goals: UserGoals = {
    fitnessGoals: JSON.parse(profile?.fitnessGoals ?? "[]"),
    calorieGoal: profile?.calorieGoal ?? null,
    dailyStepsGoal: profile?.dailyStepsGoal ?? null,
    sleepGoalHours: profile?.sleepGoalHours ?? null,
    goalWeightKg: profile?.goalWeightKg ?? null,
    age: profile?.age ?? null,
  };

  // Group recent metric values by type for "current" pillar scoring. A 30-day
  // window (rather than 7) keeps the score robust for users who log every few
  // days, while still reflecting recent behavior. Beyond 30 days the data is
  // treated as stale and the pillar reads as missing.
  const recentByType = new Map<string, number[]>();
  for (const m of metrics) {
    const arr = recentByType.get(m.type) ?? [];
    arr.push(m.value);
    recentByType.set(m.type, arr);
  }
  const avg = (type: string): number | null => {
    const arr = recentByType.get(type);
    return arr && arr.length ? mean(arr) : null;
  };

  // ── Heart pillar ──
  const restingHr = avg("resting_heart_rate") ?? avg("heart_rate");
  const hrv = avg("hrv");
  const vo2 = avg("vo2_max");
  const heart = weightedPillar([
    { value: subScore("resting_heart_rate", restingHr, goals), weight: HEART_SUBWEIGHTS.restingHr },
    { value: subScore("hrv", hrv, goals), weight: HEART_SUBWEIGHTS.hrv },
    { value: subScore("vo2_max", vo2, goals), weight: HEART_SUBWEIGHTS.vo2max },
  ]);

  // ── Motion pillar ──
  const activeCal = avg("active_calories") ?? avg("calories_burned");
  const steps = avg("steps");
  const workoutDayKeys = new Set(workouts.map((w) => dayKey(w.date)));
  const workoutsLast7 = Array.from(workoutDayKeys).filter((k) => k >= dayKey(since7)).length;
  const workoutLoad = Math.min(100, (workoutsLast7 / 4) * 100); // 4+ sessions/wk = full
  const motion = weightedPillar([
    { value: subScore("active_calories", activeCal, goals), weight: MOTION_SUBWEIGHTS.activeCalories },
    { value: workoutsLast7 > 0 ? workoutLoad : null, weight: MOTION_SUBWEIGHTS.workoutLoad },
    { value: subScore("steps", steps, goals), weight: MOTION_SUBWEIGHTS.steps },
  ]);

  // ── Recovery pillar ──
  const sleepVals = recentByType.get("sleep_hours") ?? [];
  const sleepAvg = sleepVals.length ? mean(sleepVals) : null;
  const sleepSd = sleepVals.length >= 2 ? stddev(sleepVals, mean(sleepVals)) : null;
  // Lower sleep variance is better: 0h sd = 100, >=2h sd = 0.
  const sleepConsistency = sleepSd === null ? null : Math.max(0, 100 - (sleepSd / 2) * 100);
  const recovery = weightedPillar([
    { value: subScore("sleep_hours", sleepAvg, goals), weight: RECOVERY_SUBWEIGHTS.sleepDuration },
    { value: sleepConsistency, weight: RECOVERY_SUBWEIGHTS.sleepConsistency },
    { value: subScore("hrv", hrv, goals), weight: RECOVERY_SUBWEIGHTS.overnightHrv },
  ]);

  // ── Fuel pillar ──
  const mealDayKeys = new Set(meals.map((m) => dayKey(m.date)));
  const mealDaysLast7 = Array.from(mealDayKeys).filter((k) => k >= dayKey(since7)).length;
  const loggingConsistency = (mealDaysLast7 / 7) * 100;
  // Daily calories: sum per day over last 7, averaged.
  const calsByDay = new Map<string, number>();
  const proteinByDay = new Map<string, number>();
  for (const m of meals) {
    if (m.date < since7) continue;
    const k = dayKey(m.date);
    if (m.calories) calsByDay.set(k, (calsByDay.get(k) ?? 0) + m.calories);
    if (m.proteinG) proteinByDay.set(k, (proteinByDay.get(k) ?? 0) + m.proteinG);
  }
  const avgDailyCals = calsByDay.size ? mean(Array.from(calsByDay.values())) : null;
  const calorieAdherence = subScore("calories_logged", avgDailyCals, goals);
  const avgDailyProtein = proteinByDay.size ? mean(Array.from(proteinByDay.values())) : null;
  const proteinTarget = profile?.proteinGoalG ?? (profile?.weightKg ? profile.weightKg * 1.6 : 120);
  const proteinAdequacy =
    avgDailyProtein === null ? null : Math.max(0, Math.min(100, (avgDailyProtein / proteinTarget) * 100));
  const fuel = weightedPillar([
    { value: mealDaysLast7 > 0 ? loggingConsistency : null, weight: FUEL_SUBWEIGHTS.loggingConsistency },
    { value: calorieAdherence, weight: FUEL_SUBWEIGHTS.calorieAdherence },
    { value: proteinAdequacy, weight: FUEL_SUBWEIGHTS.proteinAdequacy },
  ]);

  // ── Streaks ──
  const mealStreak = consecutiveDays(mealDayKeys);
  const workoutStreak = consecutiveDays(workoutDayKeys);

  // ── Orb (today) ──
  const todayKey = dayKey(today);
  const stepsToday = recentByType.has("steps")
    ? (recentByType.get("steps") ?? []).slice(-1)[0] ?? null
    : null;
  const stepsGoal = goals.dailyStepsGoal ?? 10000;
  const workedOutToday = workoutDayKeys.has(todayKey);
  const movePct = Math.min(
    100,
    Math.max(workedOutToday ? 100 : 0, stepsToday ? (stepsToday / stepsGoal) * 100 : 0),
  );
  const ateToday = mealDayKeys.has(todayKey);
  const calGoal = goals.calorieGoal ?? null;
  const calsToday = calsByDay.get(todayKey) ?? null;
  const fuelPct = calGoal && calsToday ? Math.min(100, (calsToday / calGoal) * 100) : ateToday ? 60 : 0;
  const sleepLast = sleepVals.length ? sleepVals.slice(-1)[0] : null;
  const sleepGoal = goals.sleepGoalHours ?? 8;
  const recoverPct = sleepLast ? Math.min(100, (sleepLast / sleepGoal) * 100) : 0;
  const focusPct = 0; // optional rotating source; wired in a later slice
  const orbFilled = movePct >= 100 && fuelPct >= 100 && recoverPct >= 100;

  await db.orbDay.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, movePct, fuelPct, recoverPct, focusPct, filledAt: orbFilled ? new Date() : null },
    update: { movePct, fuelPct, recoverPct, focusPct, filledAt: orbFilled ? new Date() : null },
  });

  // ── Consistency pillar ──
  // Orb completion proxy: fraction of last 30 days with any logged activity.
  const activeDays = new Set<string>();
  Array.from(mealDayKeys).forEach((k) => { if (k >= dayKey(since30)) activeDays.add(k); });
  Array.from(workoutDayKeys).forEach((k) => { if (k >= dayKey(since30)) activeDays.add(k); });
  for (const m of metrics) activeDays.add(dayKey(m.date));
  const orbCompletionRate = (activeDays.size / BASELINE_WINDOW_DAYS) * 100;
  const consistency = consistencyPillar(orbCompletionRate, mealStreak, workoutStreak);

  // ── Compose Flow (renormalize across present pillars) ──
  const pillarParts: Array<{ key: keyof Pillars; value: number | null; weight: number }> = [
    { key: "heart", value: heart, weight: PILLAR_WEIGHTS.heart },
    { key: "motion", value: motion, weight: PILLAR_WEIGHTS.motion },
    { key: "recovery", value: recovery, weight: PILLAR_WEIGHTS.recovery },
    { key: "fuel", value: fuel, weight: PILLAR_WEIGHTS.fuel },
    { key: "consistency", value: consistency, weight: PILLAR_WEIGHTS.consistency },
  ];
  const present = pillarParts.filter((p) => p.value !== null) as Array<{ key: keyof Pillars; value: number; weight: number }>;
  const totalWeight = present.reduce((s, p) => s + p.weight, 0);

  let rawFlow = 0;
  if (totalWeight > 0) {
    if (present.length === pillarParts.length) {
      // All pillars present: use the canonical engine function.
      rawFlow = computeRawFlow({
        heart: heart!, motion: motion!, recovery: recovery!, fuel: fuel!, consistency: consistency!,
      });
    } else {
      // Some pillars missing: renormalize weights across present pillars.
      const weightedAvg = present.reduce((s, p) => s + p.value * (p.weight / totalWeight), 0);
      rawFlow = weightedAvg * 10;
    }
  }

  // ── Calibration: first CALIBRATION_DAYS of data ──
  const earliest = metrics.length
    ? metrics.reduce((min, m) => (m.date < min ? m.date : min), metrics[0].date)
    : today;
  const daysOfData = Math.floor((today.getTime() - new Date(earliest).setUTCHours(0, 0, 0, 0)) / 86400000) + 1;
  const calibrating = daysOfData < CALIBRATION_DAYS;

  // ── EMA smoothing ──
  const flowSmoothed = applyEma(rawFlow, priorScore?.flow ?? null);
  const flowDisplay = displayFlow(flowSmoothed);
  const rank = getRank(flowDisplay);

  // ── Persist DailyScore ──
  await db.dailyScore.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId, date: today, rawFlow, flow: flowSmoothed,
      heart, motion, recovery, fuel, consistency,
      tier: rank.tier, division: rank.division, calibrating,
    },
    update: {
      rawFlow, flow: flowSmoothed,
      heart, motion, recovery, fuel, consistency,
      tier: rank.tier, division: rank.division, calibrating,
    },
  });

  // ── Persist streaks ──
  await Promise.all([
    upsertStreak(userId, "meal", mealStreak),
    upsertStreak(userId, "workout", workoutStreak),
  ]);

  // ── Refresh baselines (30-day rolling) ──
  await refreshBaselines(userId, metrics);

  return {
    flow: flowDisplay,
    rawFlow: Math.round(rawFlow),
    tier: rank.tier,
    division: rank.division,
    label: rank.label,
    calibrating,
    pillars: {
      heart: round1(heart), motion: round1(motion), recovery: round1(recovery),
      fuel: round1(fuel), consistency: round1(consistency),
    },
    streaks: { bubble: 0, meal: mealStreak, workout: workoutStreak },
    orb: { movePct: Math.round(movePct), fuelPct: Math.round(fuelPct), recoverPct: Math.round(recoverPct), focusPct, filled: orbFilled },
  };
}

function round1(v: number | null): number | null {
  return v === null ? null : Math.round(v * 10) / 10;
}

async function upsertStreak(userId: string, type: string, count: number): Promise<void> {
  await db.streak.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type, count, lastQualifyingDate: count > 0 ? new Date() : null },
    update: { count, lastQualifyingDate: count > 0 ? new Date() : null },
  });
}

async function refreshBaselines(
  userId: string,
  metrics: Array<{ type: string; value: number }>,
): Promise<void> {
  const byType = new Map<string, number[]>();
  for (const m of metrics) {
    const arr = byType.get(m.type) ?? [];
    arr.push(m.value);
    byType.set(m.type, arr);
  }
  await Promise.all(
    Array.from(byType.entries()).map(([metricType, values]) => {
      const mu = mean(values);
      return db.metricBaseline.upsert({
        where: { userId_metricType: { userId, metricType } },
        create: { userId, metricType, mean: mu, stddev: stddev(values, mu), sampleSize: values.length, periodDays: BASELINE_WINDOW_DAYS },
        update: { mean: mu, stddev: stddev(values, mu), sampleSize: values.length, periodDays: BASELINE_WINDOW_DAYS },
      });
    }),
  );
}
