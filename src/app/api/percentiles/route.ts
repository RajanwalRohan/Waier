import { db } from "@/lib/db";
import { rateLimiters } from "@/lib/rate-limit";
import {
  successResponse,
  errorResponse,
  rateLimitResponse,
  getClientIp,
  parseBody,
  handleApiError,
  requireAuthOrRespond,
} from "@/lib/api-utils";
import type { UnitSystem } from "@/lib/units";
import { kgToLbs, cmToFtIn, formatHeight } from "@/lib/units";

const AGE_RANGES: [number, number][] = [
  [13, 17], [18, 24], [25, 34], [35, 44], [45, 54], [55, 64], [65, 120],
];

/** ±10 lbs in kg */
const WEIGHT_RANGE_KG = 4.54;

/** ±2 inches in cm */
const HEIGHT_RANGE_CM = 5.08;

function getAgeRange(age: number): [number, number] {
  return AGE_RANGES.find(([min, max]) => age >= min && age <= max) ?? [13, 120];
}

function formatAgeRange(range: [number, number]): string {
  return range[1] === 120 ? `${range[0]}+` : `${range[0]}-${range[1]}`;
}

function formatWeightRange(kg: number, system: UnitSystem): string {
  if (system === "imperial") {
    const lbs = kgToLbs(kg);
    return `${Math.round(lbs - 10)}–${Math.round(lbs + 10)} lbs`;
  }
  return `${(kg - WEIGHT_RANGE_KG).toFixed(1)}–${(kg + WEIGHT_RANGE_KG).toFixed(1)} kg`;
}

function formatHeightRange(cm: number, system: UnitSystem): string {
  if (system === "imperial") {
    const lo = cmToFtIn(cm - HEIGHT_RANGE_CM);
    const hi = cmToFtIn(cm + HEIGHT_RANGE_CM);
    return `${lo.ft}'${lo.in}"–${hi.ft}'${hi.in}"`;
  }
  return `${Math.round(cm - HEIGHT_RANGE_CM)}–${Math.round(cm + HEIGHT_RANGE_CM)} cm`;
}

/**
 * POST /api/percentiles
 * Calculate the user's percentile rankings across health metrics
 * compared to a filtered group of other users.
 *
 * Body: { filters: { ageRange?, sex?, activityLevel?, fitnessGoal?, weightRange?, heightRange?, medicalConditions? } }
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    const filters = (body as Record<string, unknown>)?.filters as Record<string, boolean> ?? {};

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get current user's profile
    const myProfile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!myProfile) {
      return successResponse({
        metrics: [],
        groupSize: 0,
        activeFilters: {},
        unitSystem: "imperial",
        message: "Complete your profile to see rankings",
      });
    }

    const unitSystem = (myProfile.unitSystem || "imperial") as UnitSystem;

    // Build Prisma where clause from active filters
    const profileWhere: Record<string, unknown> = {};
    const activeFilters: Record<string, string> = {};

    if (filters.ageRange && myProfile.age) {
      const range = getAgeRange(myProfile.age);
      profileWhere.age = { gte: range[0], lte: range[1] };
      activeFilters.ageRange = `Ages ${formatAgeRange(range)}`;
    }

    if (filters.sex && myProfile.sex) {
      profileWhere.sex = myProfile.sex;
      activeFilters.sex = myProfile.sex.charAt(0).toUpperCase() + myProfile.sex.slice(1);
    }

    if (filters.activityLevel && myProfile.activityLevel) {
      profileWhere.activityLevel = myProfile.activityLevel;
      activeFilters.activityLevel = myProfile.activityLevel.replace(/_/g, " ");
    }

    if (filters.fitnessGoal && myProfile.fitnessGoal) {
      profileWhere.fitnessGoal = myProfile.fitnessGoal;
      activeFilters.fitnessGoal = myProfile.fitnessGoal.replace(/_/g, " ");
    }

    if (filters.weightRange && myProfile.weightKg) {
      profileWhere.weightKg = {
        gte: myProfile.weightKg - WEIGHT_RANGE_KG,
        lte: myProfile.weightKg + WEIGHT_RANGE_KG,
      };
      activeFilters.weightRange = formatWeightRange(myProfile.weightKg, unitSystem);
    }

    if (filters.heightRange && myProfile.heightCm) {
      profileWhere.heightCm = {
        gte: myProfile.heightCm - HEIGHT_RANGE_CM,
        lte: myProfile.heightCm + HEIGHT_RANGE_CM,
      };
      activeFilters.heightRange = formatHeightRange(myProfile.heightCm, unitSystem);
    }

    // Fetch matching profiles
    let matchingProfiles = await db.profile.findMany({
      where: profileWhere,
      select: { userId: true, medicalConditions: true },
    });

    // Medical conditions filter is done in JS (JSON arrays in SQLite)
    if (filters.medicalConditions) {
      const myConditions = JSON.parse(myProfile.medicalConditions || "[]") as string[];
      if (myConditions.length > 0) {
        matchingProfiles = matchingProfiles.filter((p) => {
          const theirs = JSON.parse(p.medicalConditions || "[]") as string[];
          return myConditions.some((c) => theirs.includes(c));
        });
        activeFilters.medicalConditions = myConditions.slice(0, 3).join(", ") + (myConditions.length > 3 ? "..." : "");
      }
    }

    const userIds = matchingProfiles.map((p) => p.userId);

    if (userIds.length < 2) {
      return successResponse({
        metrics: [],
        groupSize: userIds.length,
        activeFilters,
        unitSystem,
        message: "Not enough users in this group for comparison yet",
      });
    }

    // Fetch all data for the group in parallel
    const [allMetrics, allWorkouts, allExercises, allMeals] = await Promise.all([
      db.healthMetric.findMany({
        where: { userId: { in: userIds }, date: { gte: thirtyDaysAgo } },
        select: { userId: true, type: true, value: true },
      }),
      db.workout.findMany({
        where: { userId: { in: userIds }, date: { gte: thirtyDaysAgo } },
        select: { userId: true, id: true },
      }),
      db.exercise.findMany({
        where: {
          workout: { userId: { in: userIds }, date: { gte: thirtyDaysAgo } },
          weightKg: { not: null },
        },
        select: { workout: { select: { userId: true } }, weightKg: true },
      }),
      db.meal.findMany({
        where: { userId: { in: userIds }, date: { gte: thirtyDaysAgo } },
        select: { userId: true, calories: true },
      }),
    ]);

    const results: Array<{
      type: string;
      label: string;
      userValue: number;
      percentile: number;
      unit: string;
      groupWithData: number;
    }> = [];

    // ── Health metric percentiles ──
    const metricConfig: Record<string, { label: string; unit: string; invertPercentile: boolean }> = {
      steps: { label: "Daily Steps", unit: "steps", invertPercentile: false },
      heart_rate: { label: "Resting Heart Rate", unit: "bpm", invertPercentile: true },
      sleep_hours: { label: "Sleep", unit: "hrs", invertPercentile: false },
      calories_burned: { label: "Calories Burned", unit: "kcal", invertPercentile: false },
      calories_logged: { label: "Calories Logged", unit: "kcal", invertPercentile: false },
      blood_oxygen: { label: "Blood Oxygen", unit: "SpO2 %", invertPercentile: false },
      hrv: { label: "Heart Rate Variability", unit: "ms", invertPercentile: false },
      respiratory_rate: { label: "Respiratory Rate", unit: "brpm", invertPercentile: true },
      weight: { label: "Weight", unit: unitSystem === "imperial" ? "lbs" : "kg", invertPercentile: false },
      vo2_max: { label: "VO2 Max", unit: "mL/kg/min", invertPercentile: false },
      stress_level: { label: "Stress Level", unit: "score", invertPercentile: true },
      body_battery: { label: "Body Battery", unit: "score", invertPercentile: false },
    };

    for (const [type, config] of Object.entries(metricConfig)) {
      const byUser = new Map<string, number[]>();
      for (const m of allMetrics) {
        if (m.type === type) {
          if (!byUser.has(m.userId)) byUser.set(m.userId, []);
          byUser.get(m.userId)!.push(m.value);
        }
      }

      if (byUser.size < 2 || !byUser.has(session.user.id)) continue;

      const userAvgs = Array.from(byUser.entries())
        .map(([uid, vals]) => ({ uid, avg: vals.reduce((s, v) => s + v, 0) / vals.length }))
        .sort((a, b) => a.avg - b.avg);

      const myIdx = userAvgs.findIndex((u) => u.uid === session.user.id);
      const myAvg = userAvgs[myIdx].avg;
      let pct = userAvgs.length > 1 ? Math.round((myIdx / (userAvgs.length - 1)) * 100) : 50;
      if (config.invertPercentile) pct = 100 - pct;

      // Convert weight for imperial display (stored in kg)
      const displayValue = type === "weight" && unitSystem === "imperial"
        ? kgToLbs(myAvg)
        : Math.round(myAvg * 10) / 10;

      results.push({
        type,
        label: config.label,
        userValue: displayValue,
        percentile: pct,
        unit: config.unit,
        groupWithData: userAvgs.length,
      });
    }

    // ── Lifting weight (avg exercise weight) ──
    const liftByUser = new Map<string, number[]>();
    for (const ex of allExercises) {
      if (ex.weightKg != null) {
        const uid = ex.workout.userId;
        if (!liftByUser.has(uid)) liftByUser.set(uid, []);
        liftByUser.get(uid)!.push(ex.weightKg);
      }
    }

    if (liftByUser.size >= 2 && liftByUser.has(session.user.id)) {
      const liftAvgs = Array.from(liftByUser.entries())
        .map(([uid, vals]) => ({ uid, avg: vals.reduce((s, v) => s + v, 0) / vals.length }))
        .sort((a, b) => a.avg - b.avg);

      const myIdx = liftAvgs.findIndex((u) => u.uid === session.user.id);
      if (myIdx !== -1) {
        const myAvgKg = liftAvgs[myIdx].avg;
        const displayValue = unitSystem === "imperial" ? kgToLbs(myAvgKg) : Math.round(myAvgKg * 10) / 10;
        results.push({
          type: "lifting",
          label: "Avg Lifting Weight",
          userValue: displayValue,
          percentile: liftAvgs.length > 1 ? Math.round((myIdx / (liftAvgs.length - 1)) * 100) : 50,
          unit: unitSystem === "imperial" ? "lbs" : "kg",
          groupWithData: liftAvgs.length,
        });
      }
    }

    // ── Workout frequency ──
    const workoutCounts = new Map<string, number>();
    for (const uid of userIds) workoutCounts.set(uid, 0);
    for (const w of allWorkouts) workoutCounts.set(w.userId, (workoutCounts.get(w.userId) ?? 0) + 1);

    if (workoutCounts.size >= 2 && (workoutCounts.get(session.user.id) ?? 0) > 0) {
      const sorted = Array.from(workoutCounts.entries())
        .map(([uid, count]) => ({ uid, avg: count }))
        .sort((a, b) => a.avg - b.avg);
      const myIdx = sorted.findIndex((u) => u.uid === session.user.id);
      if (myIdx !== -1) {
        results.push({
          type: "workouts",
          label: "Workouts",
          userValue: workoutCounts.get(session.user.id) ?? 0,
          percentile: sorted.length > 1 ? Math.round((myIdx / (sorted.length - 1)) * 100) : 50,
          unit: "sessions",
          groupWithData: sorted.length,
        });
      }
    }

    // ── Calories logged (meals) ──
    const calByUser = new Map<string, number[]>();
    for (const m of allMeals) {
      if (m.calories) {
        if (!calByUser.has(m.userId)) calByUser.set(m.userId, []);
        calByUser.get(m.userId)!.push(m.calories);
      }
    }

    if (calByUser.size >= 2 && calByUser.has(session.user.id)) {
      const calAvgs = Array.from(calByUser.entries())
        .map(([uid, cals]) => ({ uid, avg: cals.reduce((s, v) => s + v, 0) / cals.length }))
        .sort((a, b) => a.avg - b.avg);
      const myIdx = calAvgs.findIndex((u) => u.uid === session.user.id);
      if (myIdx !== -1) {
        results.push({
          type: "calories",
          label: "Avg Calories",
          userValue: Math.round(calAvgs[myIdx].avg),
          percentile: calAvgs.length > 1 ? Math.round((myIdx / (calAvgs.length - 1)) * 100) : 50,
          unit: "kcal/day",
          groupWithData: calAvgs.length,
        });
      }
    }

    return successResponse({
      metrics: results,
      groupSize: userIds.length,
      activeFilters,
      unitSystem,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
