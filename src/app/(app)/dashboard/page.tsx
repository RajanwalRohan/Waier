import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const session = await getServerSession();
  const userId = session!.user.id;

  // Fetch recent data for the dashboard
  const [profile, recentWorkouts, todayMeals, recentMetrics] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    db.workout.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 3,
      include: { exercises: true },
    }),
    db.meal.findMany({
      where: {
        userId,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      orderBy: { date: "desc" },
    }),
    db.healthMetric.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  const todayCalories = todayMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const latestSteps = recentMetrics.find((m) => m.type === "steps");
  const latestHR = recentMetrics.find((m) => m.type === "heart_rate");
  const latestSleep = recentMetrics.find((m) => m.type === "sleep_hours");

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {session!.user.name ?? "there"}
        </h1>
        <p className="text-sm text-gray-500">Here&apos;s your health summary</p>
      </div>

      {/* AI Insight Card */}
      <div className="card mb-4 bg-gradient-to-r from-brand-50 to-blue-50">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🧠</span>
          <div>
            <h3 className="font-semibold text-gray-900">AI Insight</h3>
            <p className="mt-1 text-sm text-gray-600">
              {recentWorkouts.length === 0
                ? "Start logging your workouts to get personalized insights!"
                : `You've logged ${recentWorkouts.length} recent workouts. Keep up the great work!`}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        {[
          { label: "Workout", href: "/log?tab=workout", emoji: "💪" },
          { label: "Meal", href: "/log?tab=meal", emoji: "🍽️" },
          { label: "Coach", href: "/coach", emoji: "🤖" },
          { label: "Metrics", href: "/progress", emoji: "📊" },
        ].map((action) => (
          <a
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 text-xs font-medium text-gray-700 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl">{action.emoji}</span>
            {action.label}
          </a>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <MetricCard
          label="Steps"
          value={latestSteps ? Math.round(latestSteps.value).toLocaleString() : "—"}
          unit="steps"
          color="text-blue-600"
        />
        <MetricCard
          label="Heart Rate"
          value={latestHR ? Math.round(latestHR.value).toString() : "—"}
          unit="bpm"
          color="text-red-500"
        />
        <MetricCard
          label="Sleep"
          value={latestSleep ? latestSleep.value.toFixed(1) : "—"}
          unit="hours"
          color="text-purple-600"
        />
        <MetricCard
          label="Calories"
          value={todayCalories > 0 ? Math.round(todayCalories).toLocaleString() : "—"}
          unit="kcal today"
          color="text-orange-500"
        />
      </div>

      {/* Recent Workouts */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Recent Workouts</h2>
        {recentWorkouts.length === 0 ? (
          <p className="text-sm text-gray-500">No workouts logged yet.</p>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map((w) => (
              <div key={w.id} className="card py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{w.name}</p>
                    <p className="text-xs text-gray-500">
                      {w.exercises.length} exercises
                      {w.durationMin ? ` · ${w.durationMin} min` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(w.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="card py-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{unit}</p>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
