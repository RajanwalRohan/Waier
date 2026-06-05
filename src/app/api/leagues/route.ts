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
import { activityPoints, computeLP, rankZone, isoWeekKey, weekRange } from "@/lib/open-leagues";

async function userTier(userId: string): Promise<string> {
  const score = await db.dailyScore.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { tier: true } });
  return score?.tier ?? "Still";
}

/** Compute LP for each member of a cohort for the current week. */
async function computeCohortLP(memberIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const id of memberIds) out.set(id, 0);
  if (memberIds.length === 0) return out;

  const { start: thisStart, end: thisEnd } = weekRange(new Date());
  const priorStart = new Date(thisStart);
  priorStart.setUTCDate(priorStart.getUTCDate() - 7);

  const [metrics, workouts] = await Promise.all([
    db.healthMetric.findMany({
      where: { userId: { in: memberIds }, type: { in: ["steps", "active_calories"] }, date: { gte: priorStart, lt: thisEnd } },
      select: { userId: true, type: true, value: true, date: true },
    }),
    db.workout.findMany({ where: { userId: { in: memberIds }, date: { gte: priorStart, lt: thisEnd } }, select: { userId: true, date: true } }),
  ]);

  type WeekAgg = { steps: number; cal: number; workouts: number };
  const blank = (): WeekAgg => ({ steps: 0, cal: 0, workouts: 0 });
  const cur = new Map<string, WeekAgg>();
  const prev = new Map<string, WeekAgg>();
  for (const id of memberIds) {
    cur.set(id, blank());
    prev.set(id, blank());
  }

  for (const m of metrics) {
    const bucket = m.date >= thisStart ? cur : prev;
    const agg = bucket.get(m.userId)!;
    if (m.type === "steps") agg.steps += m.value;
    else if (m.type === "active_calories") agg.cal += m.value;
  }
  for (const w of workouts) {
    const bucket = w.date >= thisStart ? cur : prev;
    bucket.get(w.userId)!.workouts += 1;
  }

  for (const id of memberIds) {
    const c = cur.get(id)!;
    const p = prev.get(id)!;
    const points = activityPoints(c.steps, c.cal, c.workouts);
    const priorPoints = activityPoints(p.steps, p.cal, p.workouts);
    out.set(id, computeLP(points, points - priorPoints));
  }
  return out;
}

/** GET /api/leagues — the user's current-week cohort, leaderboard, and zones. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const weekKey = isoWeekKey(new Date());
    const membership = await db.leagueMembership.findUnique({
      where: { userId_weekKey: { userId: session.user.id, weekKey } },
      include: { league: { include: { memberships: { select: { userId: true } } } } },
    });

    if (!membership) {
      return successResponse({ joined: false, tier: await userTier(session.user.id), weekKey });
    }

    const memberIds = membership.league.memberships.map((m) => m.userId);
    const lp = await computeCohortLP(memberIds);

    const ranked = memberIds
      .map((id) => ({ userId: id, lp: lp.get(id) ?? 0 }))
      .sort((a, b) => b.lp - a.lp)
      .map((row, i) => ({ rank: i + 1, ...row, zone: rankZone(i + 1, memberIds.length), isMe: row.userId === session.user.id }));

    const { start, end } = weekRange(new Date());

    return successResponse({
      joined: true,
      tier: membership.league.tier,
      weekKey,
      weekStart: start.toISOString().slice(0, 10),
      weekEnd: new Date(end.getTime() - 86400000).toISOString().slice(0, 10),
      size: memberIds.length,
      leaderboard: ranked.map((r) => ({ rank: r.rank, lp: r.lp, zone: r.zone, isMe: r.isMe, name: r.isMe ? "You" : `Athlete ${r.rank}` })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/leagues — join this week's cohort for your tier. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const weekKey = isoWeekKey(new Date());
    const existing = await db.leagueMembership.findUnique({ where: { userId_weekKey: { userId: session.user.id, weekKey } } });
    if (existing) return successResponse({ joined: true });

    const tier = await userTier(session.user.id);
    const league = await db.league.upsert({
      where: { tier_weekKey: { tier, weekKey } },
      create: { tier, weekKey },
      update: {},
    });
    await db.leagueMembership.create({ data: { leagueId: league.id, userId: session.user.id, weekKey } });

    return successResponse({ joined: true }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
