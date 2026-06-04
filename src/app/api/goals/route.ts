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
import { createGoalSchema } from "@/lib/validations/goals";
import { goalView, daysUntil } from "@/lib/goals";

/**
 * Resolve a goal's current value from live data.
 * Returns null when the goal type has no automatic source (e.g. custom).
 */
async function resolveCurrentValue(
  userId: string,
  goal: { type: string; metricType: string | null; streakType: string | null },
): Promise<number | null> {
  switch (goal.type) {
    case "weight":
    case "health_metric":
    case "distance": {
      const type = goal.metricType ?? (goal.type === "weight" ? "weight" : goal.type === "distance" ? "distance" : null);
      if (!type) return null;
      const latest = await db.healthMetric.findFirst({
        where: { userId, type },
        orderBy: { date: "desc" },
        select: { value: true },
      });
      return latest?.value ?? null;
    }
    case "strength_pr": {
      const agg = await db.exercise.aggregate({
        where: { workout: { userId }, weightKg: { not: null } },
        _max: { weightKg: true },
      });
      return agg._max.weightKg ?? null;
    }
    case "habit_streak": {
      if (!goal.streakType) return null;
      const streak = await db.streak.findUnique({
        where: { userId_type: { userId, type: goal.streakType } },
        select: { count: true },
      });
      return streak?.count ?? 0;
    }
    default:
      return null;
  }
}

/** GET /api/goals — active and completed goals with live progress. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const goals = await db.goal.findMany({
      where: { userId: session.user.id, status: { in: ["active", "paused", "completed"] } },
      orderBy: { createdAt: "desc" },
    });

    const out = await Promise.all(
      goals.map(async (g) => {
        const current = await resolveCurrentValue(session.user.id, g);
        const start = g.startValue ?? current ?? 0;
        const view = current !== null ? goalView(start, current, g.targetValue) : null;

        // Auto-complete an active goal that has reached its target.
        if (view?.complete && g.status === "active") {
          await db.goal.update({ where: { id: g.id }, data: { status: "completed", completedAt: new Date() } });
          g.status = "completed";
          g.completedAt = new Date();
        }

        return {
          id: g.id,
          type: g.type,
          title: g.title,
          targetValue: g.targetValue,
          targetUnit: g.targetUnit,
          startValue: start,
          current,
          progress: view ? Math.round(view.progress * 100) : null,
          complete: view?.complete ?? false,
          remaining: view ? Math.round(view.remaining * 10) / 10 : null,
          status: g.status,
          deadline: g.deadline ? g.deadline.toISOString().slice(0, 10) : null,
          daysLeft: daysUntil(g.deadline),
        };
      }),
    );

    return successResponse({ goals: out });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/goals — create a goal, snapshotting the current value as the start. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const data = createGoalSchema.parse(body);

    const start = data.startValue ?? (await resolveCurrentValue(session.user.id, {
      type: data.type,
      metricType: data.metricType ?? null,
      streakType: data.streakType ?? null,
    })) ?? undefined;

    const goal = await db.goal.create({
      data: {
        userId: session.user.id,
        type: data.type,
        title: data.title,
        metricType: data.metricType,
        streakType: data.streakType,
        targetValue: data.targetValue,
        targetUnit: data.targetUnit,
        startValue: start ?? null,
        deadline: data.deadline,
      },
    });

    return successResponse({ id: goal.id }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
