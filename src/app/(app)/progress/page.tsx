import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import PercentileRankings from "@/components/PercentileRankings";
import ProgressContent from "@/components/ProgressContent";
import type { UnitSystem } from "@/lib/units";

export default async function ProgressPage() {
  const session = await getServerSession();
  const userId = session!.user.id;

  const [profile, workouts, meals, metrics] = await Promise.all([
    db.profile.findUnique({
      where: { userId },
      select: {
        unitSystem: true,
        fitnessGoals: true,
        calorieGoal: true,
        dailyStepsGoal: true,
        sleepGoalHours: true,
        goalWeightKg: true,
        age: true,
      },
    }),
    db.workout.findMany({ where: { userId }, select: { id: true, date: true } }),
    db.meal.findMany({ where: { userId }, select: { id: true, date: true } }),
    db.healthMetric.findMany({
      where: { userId },
      select: { id: true, type: true, value: true, unit: true, source: true, date: true },
      orderBy: { date: "desc" },
    }),
  ]);

  // Serialize dates to ISO strings for the client component
  const serializedWorkouts = workouts.map((w) => ({ id: w.id, date: w.date.toISOString() }));
  const serializedMeals = meals.map((m) => ({ id: m.id, date: m.date.toISOString() }));
  const serializedMetrics = metrics.map((m) => ({
    id: m.id,
    type: m.type,
    value: m.value,
    unit: m.unit,
    source: m.source,
    date: m.date.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-lg px-5 pt-8 pb-24">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Progress</h1>

      <ProgressContent
        workouts={serializedWorkouts}
        meals={serializedMeals}
        metrics={serializedMetrics}
        goals={{
          fitnessGoals: profile?.fitnessGoals ? (() => { try { return JSON.parse(profile.fitnessGoals); } catch { return []; } })() : [],
          calorieGoal: profile?.calorieGoal,
          dailyStepsGoal: profile?.dailyStepsGoal,
          sleepGoalHours: profile?.sleepGoalHours,
          goalWeightKg: profile?.goalWeightKg,
          age: profile?.age,
        }}
      />

      <div className="mb-6 mt-6">
        <PercentileRankings unitSystem={(profile?.unitSystem as UnitSystem) || "imperial"} />
      </div>
    </div>
  );
}
