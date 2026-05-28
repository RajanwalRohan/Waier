/**
 * Metric grading utility.
 *
 * Grades a health metric value on a 4-tier scale based on:
 *  1. Medical recommendations (resting HR, SpO2, respiratory rate, HRV, etc.)
 *  2. The user's personal goals (calorie target, step goal, sleep goal, weight goal)
 *
 * Color mapping:
 *   excellent → green   (bg-emerald-500)
 *   good      → blue    (bg-blue-500)
 *   ok        → amber   (bg-amber-500)
 *   poor      → red     (bg-red-500)
 */

export type Grade = "excellent" | "good" | "ok" | "poor";

export interface UserGoals {
  fitnessGoals?: string[];   // e.g. ["gain_muscle", "clean_bulk"]
  calorieGoal?: number | null;
  dailyStepsGoal?: number | null;
  sleepGoalHours?: number | null;
  goalWeightKg?: number | null;
  age?: number | null;
}

const GRADE_COLORS: Record<Grade, string> = {
  excellent: "bg-emerald-500",
  good: "bg-blue-500",
  ok: "bg-amber-500",
  poor: "bg-red-500",
};

/**
 * Grade a metric value and return the Tailwind color class for the accent bar.
 */
export function getMetricColor(type: string, value: number, goals: UserGoals): string {
  return GRADE_COLORS[getMetricGrade(type, value, goals)];
}

/**
 * Grade a metric value on the 4-tier scale.
 */
export function getMetricGrade(type: string, value: number, goals: UserGoals): Grade {
  const grader = METRIC_GRADERS[type];
  if (!grader) return "good"; // unknown metrics default to blue
  return grader(value, goals);
}

// ── Grading functions per metric type ─────────────────────

const METRIC_GRADERS: Record<string, (value: number, goals: UserGoals) => Grade> = {

  // ── Heart Rate (resting, bpm) ──
  // Medical: <60 athlete, 60-72 healthy, 73-84 avg, >84 elevated
  heart_rate: (v) => {
    if (v <= 60) return "excellent";
    if (v <= 72) return "good";
    if (v <= 84) return "ok";
    return "poor";
  },
  resting_heart_rate: (v) => METRIC_GRADERS.heart_rate(v, {}),

  // ── Blood Oxygen (SpO2 %) ──
  // Medical: 98-100 optimal, 95-97 normal, 92-94 borderline, <92 concern
  blood_oxygen: (v) => {
    if (v >= 98) return "excellent";
    if (v >= 95) return "good";
    if (v >= 92) return "ok";
    return "poor";
  },

  // ── Heart Rate Variability (ms) ──
  // Higher is generally better — indicates good recovery
  // Medical: >50 great, 30-50 normal, 20-30 below avg, <20 low
  hrv: (v) => {
    if (v >= 50) return "excellent";
    if (v >= 30) return "good";
    if (v >= 20) return "ok";
    return "poor";
  },

  // ── Respiratory Rate (breaths/min) ──
  // Medical: 12-16 normal, 16-18 slightly high, 18-20 elevated, >20 or <12 concern
  respiratory_rate: (v) => {
    if (v >= 12 && v <= 16) return "excellent";
    if ((v >= 10 && v < 12) || (v > 16 && v <= 18)) return "good";
    if ((v >= 8 && v < 10) || (v > 18 && v <= 20)) return "ok";
    return "poor";
  },

  // ── Sleep Hours ──
  // Uses user's sleep goal if set, otherwise medical recommendation (7-9h adults)
  sleep_hours: (v, goals) => {
    const target = goals.sleepGoalHours ?? 8;
    const diff = Math.abs(v - target);
    if (diff <= 0.5) return "excellent";
    if (diff <= 1) return "good";
    if (diff <= 1.5) return "ok";
    return "poor";
  },

  // ── Steps ──
  // Uses user's daily steps goal, default 10,000
  steps: (v, goals) => {
    const target = goals.dailyStepsGoal ?? 10000;
    const pct = v / target;
    if (pct >= 1.0) return "excellent";
    if (pct >= 0.75) return "good";
    if (pct >= 0.5) return "ok";
    return "poor";
  },

  // ── Calories Burned ──
  // More is generally better — graded relative to a reasonable baseline
  calories_burned: (v) => {
    if (v >= 2500) return "excellent";
    if (v >= 2000) return "good";
    if (v >= 1500) return "ok";
    return "poor";
  },

  // ── Calories Logged ──
  // Goal-dependent: bulking = hitting high target is excellent, cutting = staying under target is excellent
  calories_logged: (v, goals) => {
    const target = goals.calorieGoal;
    if (!target) {
      // No goal set — use a generic range
      if (v >= 1800 && v <= 2500) return "good";
      if (v >= 1500 && v <= 3000) return "ok";
      return "poor";
    }

    const fg = goals.fitnessGoals ?? [];
    const isBulking = fg.some((g) => ["gain_muscle", "clean_bulk", "build_strength"].includes(g));
    const isCutting = fg.some((g) => ["lose_weight", "clean_cut"].includes(g));

    const pct = v / target;

    if (isBulking) {
      // Meeting or slightly exceeding target = excellent
      if (pct >= 0.95 && pct <= 1.15) return "excellent";
      if (pct >= 0.85 && pct <= 1.25) return "good";
      if (pct >= 0.70) return "ok";
      return "poor";
    }

    if (isCutting) {
      // At or slightly under target = excellent
      if (pct >= 0.85 && pct <= 1.05) return "excellent";
      if (pct >= 0.75 && pct <= 1.15) return "good";
      if (pct <= 1.25) return "ok";
      return "poor";
    }

    // Maintaining — within ±10% of target is excellent
    if (pct >= 0.90 && pct <= 1.10) return "excellent";
    if (pct >= 0.80 && pct <= 1.20) return "good";
    if (pct >= 0.70 && pct <= 1.30) return "ok";
    return "poor";
  },

  // ── Weight ──
  // Graded by proximity to goal weight
  weight: (v, goals) => {
    const target = goals.goalWeightKg;
    if (!target) return "good"; // no goal = neutral blue
    const pct = Math.abs(v - target) / target;
    if (pct <= 0.02) return "excellent";
    if (pct <= 0.05) return "good";
    if (pct <= 0.10) return "ok";
    return "poor";
  },

  // ── VO2 Max (mL/kg/min) ──
  // Higher is better. Ranges vary by age/sex, but general adult benchmarks:
  vo2_max: (v) => {
    if (v >= 45) return "excellent";
    if (v >= 35) return "good";
    if (v >= 25) return "ok";
    return "poor";
  },

  // ── Body Fat Percentage ──
  // Lower is generally healthier within reason
  body_fat_percentage: (v) => {
    if (v <= 15) return "excellent";
    if (v <= 22) return "good";
    if (v <= 30) return "ok";
    return "poor";
  },

  // ── Stress Level (score, lower = better) ──
  stress_level: (v) => {
    if (v <= 25) return "excellent";
    if (v <= 50) return "good";
    if (v <= 75) return "ok";
    return "poor";
  },

  // ── Body Battery (score, higher = better) ──
  body_battery: (v) => {
    if (v >= 75) return "excellent";
    if (v >= 50) return "good";
    if (v >= 25) return "ok";
    return "poor";
  },

  // ── Skin Temperature (°C) — normal body temp range ──
  skin_temperature: (v) => {
    if (v >= 36.1 && v <= 37.2) return "excellent";
    if ((v >= 35.5 && v < 36.1) || (v > 37.2 && v <= 37.8)) return "good";
    if ((v >= 35.0 && v < 35.5) || (v > 37.8 && v <= 38.3)) return "ok";
    return "poor";
  },

  // ── Blood Glucose (mg/dL fasting) ──
  blood_glucose: (v) => {
    if (v >= 70 && v <= 99) return "excellent";
    if ((v >= 60 && v < 70) || (v > 99 && v <= 125)) return "good";
    if ((v >= 50 && v < 60) || (v > 125 && v <= 140)) return "ok";
    return "poor";
  },

  // ── Active Calories — more = better ──
  active_calories: (v) => {
    if (v >= 500) return "excellent";
    if (v >= 300) return "good";
    if (v >= 150) return "ok";
    return "poor";
  },

  // ── Distance (km) ──
  distance: (v) => {
    if (v >= 8) return "excellent";
    if (v >= 5) return "good";
    if (v >= 2) return "ok";
    return "poor";
  },

  // ── Floors Climbed ──
  floors_climbed: (v) => {
    if (v >= 15) return "excellent";
    if (v >= 10) return "good";
    if (v >= 5) return "ok";
    return "poor";
  },
};
