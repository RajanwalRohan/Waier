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
import { addHydrationSchema } from "@/lib/validations/intake";
import { sumHydrationMl, DEFAULT_HYDRATION_GOAL_ML } from "@/lib/intake";

function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** GET /api/hydration — today's total, the daily goal, and the last 7 days. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const today = todayUtc();
    const weekAgo = new Date(today);
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);

    const [profile, weekLogs] = await Promise.all([
      db.profile.findUnique({ where: { userId: session.user.id }, select: { hydrationGoalMl: true } }),
      db.hydrationLog.findMany({
        where: { userId: session.user.id, date: { gte: weekAgo } },
        select: { amountMl: true, date: true },
      }),
    ]);

    const goalMl = profile?.hydrationGoalMl ?? DEFAULT_HYDRATION_GOAL_ML;
    const todayKey = today.toISOString().slice(0, 10);
    const todayLogs = weekLogs.filter((l) => l.date.toISOString().slice(0, 10) === todayKey);

    const byDay: Record<string, number> = {};
    for (const l of weekLogs) {
      const k = l.date.toISOString().slice(0, 10);
      byDay[k] = (byDay[k] ?? 0) + l.amountMl;
    }

    return successResponse({
      goalMl,
      todayMl: sumHydrationMl(todayLogs),
      week: Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, ml]) => ({ date, ml })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/hydration — add water to today's total. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const { amountMl } = addHydrationSchema.parse(body);

    await db.hydrationLog.create({ data: { userId: session.user.id, date: todayUtc(), amountMl } });
    return successResponse({ ok: true }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
