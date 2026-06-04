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
import { materializeFlow } from "@/lib/flow/materialize";

/**
 * GET /api/flow
 * Recompute and return the user's current Flow: headline score, rank, the five
 * pillar scores, streaks, today's Orb state, and a 14-day history sparkline.
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const result = await materializeFlow(session.user.id);

    const [history, streaks] = await Promise.all([
      db.dailyScore.findMany({
        where: { userId: session.user.id },
        orderBy: { date: "desc" },
        take: 14,
        select: { date: true, flow: true, tier: true },
      }),
      db.streak.findMany({
        where: { userId: session.user.id },
        select: { type: true, count: true },
      }),
    ]);

    const streakByType: Record<string, number> = {};
    for (const s of streaks) streakByType[s.type] = s.count;

    return successResponse({
      ...result,
      streaks: {
        bubble: streakByType.bubble ?? 0,
        meal: streakByType.meal ?? result.streaks.meal,
        workout: streakByType.workout ?? result.streaks.workout,
      },
      history: history
        .reverse()
        .map((h) => ({ date: h.date.toISOString().slice(0, 10), flow: Math.round(h.flow), tier: h.tier })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
