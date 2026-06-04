import { rateLimiters } from "@/lib/rate-limit";
import {
  successResponse,
  errorResponse,
  rateLimitResponse,
  getClientIp,
  handleApiError,
  requireAuthOrRespond,
} from "@/lib/api-utils";
import { db } from "@/lib/db";
import { getMetricGrade, type UserGoals } from "@/lib/metric-grading";

/** Display label + unit per metric type for the detail page header. */
const METRIC_META: Record<string, { label: string; unit: string }> = {
  steps: { label: "Steps", unit: "steps" },
  heart_rate: { label: "Heart Rate", unit: "bpm" },
  resting_heart_rate: { label: "Resting Heart Rate", unit: "bpm" },
  sleep_hours: { label: "Sleep", unit: "hours" },
  calories_burned: { label: "Calories Burned", unit: "kcal" },
  active_calories: { label: "Active Calories", unit: "kcal" },
  calories_logged: { label: "Calories Logged", unit: "kcal" },
  blood_oxygen: { label: "Blood Oxygen", unit: "%" },
  respiratory_rate: { label: "Respiratory Rate", unit: "brpm" },
  hrv: { label: "Heart Rate Variability", unit: "ms" },
  weight: { label: "Weight", unit: "kg" },
  skin_temperature: { label: "Skin Temperature", unit: "°C" },
  blood_glucose: { label: "Blood Glucose", unit: "mg/dL" },
  vo2_max: { label: "VO2 Max", unit: "mL/kg/min" },
  body_fat_percentage: { label: "Body Fat", unit: "%" },
  distance: { label: "Distance", unit: "km" },
  floors_climbed: { label: "Floors Climbed", unit: "floors" },
  stress_level: { label: "Stress Level", unit: "score" },
  body_battery: { label: "Body Battery", unit: "score" },
};

/**
 * GET /api/flow/metric/[type]
 * Deep-dive data for a single metric's detail page: recent series, the user's
 * 30-day personal baseline, latest value, and clinical grade.
 */
export async function GET(request: Request, { params }: { params: { type: string } }) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const type = params.type;
    const meta = METRIC_META[type] ?? { label: type.replace(/_/g, " "), unit: "" };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const [series, baseline, profile] = await Promise.all([
      db.healthMetric.findMany({
        where: { userId: session.user.id, type, date: { gte: thirtyDaysAgo } },
        orderBy: { date: "asc" },
        select: { value: true, date: true },
      }),
      db.metricBaseline.findUnique({
        where: { userId_metricType: { userId: session.user.id, metricType: type } },
      }),
      db.profile.findUnique({ where: { userId: session.user.id } }),
    ]);

    const goals: UserGoals = {
      fitnessGoals: JSON.parse(profile?.fitnessGoals ?? "[]"),
      calorieGoal: profile?.calorieGoal ?? null,
      dailyStepsGoal: profile?.dailyStepsGoal ?? null,
      sleepGoalHours: profile?.sleepGoalHours ?? null,
      goalWeightKg: profile?.goalWeightKg ?? null,
      age: profile?.age ?? null,
    };

    const latest = series.length ? series[series.length - 1].value : null;
    const grade = latest !== null ? getMetricGrade(type, latest, goals) : null;

    return successResponse({
      type,
      label: meta.label,
      unit: meta.unit,
      latest,
      grade,
      baseline: baseline
        ? { mean: Math.round(baseline.mean * 10) / 10, stddev: Math.round(baseline.stddev * 10) / 10, sampleSize: baseline.sampleSize }
        : null,
      series: series.map((s) => ({ date: s.date.toISOString().slice(0, 10), value: s.value })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
