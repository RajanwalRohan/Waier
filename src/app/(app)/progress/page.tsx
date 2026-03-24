import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ProgressPage() {
  const session = await getServerSession();
  const userId = session!.user.id;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [workoutCount, mealCount, metrics] = await Promise.all([
    db.workout.count({
      where: { userId, date: { gte: thirtyDaysAgo } },
    }),
    db.meal.count({
      where: { userId, date: { gte: thirtyDaysAgo } },
    }),
    db.healthMetric.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "desc" },
    }),
  ]);

  // Group metrics by type
  const grouped = metrics.reduce(
    (acc, m) => {
      if (!acc[m.type]) acc[m.type] = [];
      acc[m.type].push(m);
      return acc;
    },
    {} as Record<string, typeof metrics>,
  );

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Progress</h1>

      {/* 30-day Summary */}
      <div className="card mb-6 bg-gradient-to-r from-brand-50 to-emerald-50">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Last 30 Days
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-bold text-brand-700">{workoutCount}</p>
            <p className="text-xs text-gray-500">Workouts</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-brand-700">{mealCount}</p>
            <p className="text-xs text-gray-500">Meals Logged</p>
          </div>
        </div>
      </div>

      {/* Metric Sections */}
      {Object.entries(grouped).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">
            No health metrics recorded yet. Start logging or connect a wearable!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, items]) => {
            const latest = items[0];
            const avg =
              items.reduce((sum, i) => sum + i.value, 0) / items.length;
            return (
              <div key={type} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 capitalize">
                      {type.replace(/_/g, " ")}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {items.length} readings · avg {avg.toFixed(1)} {latest.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {latest.value.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-400">{latest.unit}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
