import { db } from "@/lib/db";
import { rateLimiters } from "@/lib/rate-limit";
import {
  successResponse,
  errorResponse,
  rateLimitResponse,
  getClientIp,
  handleApiError,
  requireAuthOrRespond,
} from "@/lib/api-utils";
import { buildWrapped } from "@/lib/wrapped";

/** GET /api/wrapped[?year=] — the year-in-review summary. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const yearParam = new URL(request.url).searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const userId = session.user.id;

    const [scores, workoutCount, mealCount, distanceAgg, activeAgg, streaks] = await Promise.all([
      db.dailyScore.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
      db.workout.count({ where: { userId, date: { gte: start, lt: end } } }),
      db.meal.count({ where: { userId, date: { gte: start, lt: end } } }),
      db.healthMetric.aggregate({ where: { userId, type: "distance", date: { gte: start, lt: end } }, _sum: { value: true } }),
      db.healthMetric.aggregate({ where: { userId, type: "active_calories", date: { gte: start, lt: end } }, _sum: { value: true } }),
      db.streak.findMany({ where: { userId }, select: { count: true } }),
    ]);

    const avg = (vals: Array<number | null>) => {
      const present = vals.filter((v): v is number => v !== null);
      return present.length ? present.reduce((s, v) => s + v, 0) / present.length : null;
    };

    const summary = buildWrapped({
      year,
      flowSeries: scores.map((s) => ({ date: s.date.toISOString().slice(0, 10), flow: Math.round(s.flow) })),
      totalWorkouts: workoutCount,
      totalMeals: mealCount,
      totalDistanceKm: distanceAgg._sum.value ?? 0,
      totalActiveCalories: activeAgg._sum.value ?? 0,
      longestStreak: streaks.reduce((max, s) => Math.max(max, s.count), 0),
      pillarAverages: {
        heart: avg(scores.map((s) => s.heart)),
        motion: avg(scores.map((s) => s.motion)),
        recovery: avg(scores.map((s) => s.recovery)),
        fuel: avg(scores.map((s) => s.fuel)),
        consistency: avg(scores.map((s) => s.consistency)),
      },
    });

    return successResponse(summary);
  } catch (err) {
    return handleApiError(err);
  }
}
