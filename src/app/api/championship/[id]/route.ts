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
import { scoreMatchup, pairRound, currentPeriod, type CategoryInput } from "@/lib/championship";
import { computeCategoryValues, CATEGORY_LABELS } from "@/lib/championship-data";

/** GET /api/championship/[id] — league detail with the live matchup and standings. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const league = await db.championshipLeague.findUnique({
      where: { id: params.id },
      include: { members: { include: { user: { select: { id: true, name: true } } } } },
    });
    if (!league) return errorResponse("League not found", 404);

    const memberIds = league.members.map((m) => m.userId);
    if (!memberIds.includes(session.user.id)) return errorResponse("You are not in this league", 403);

    const profiles = await db.profile.findMany({ where: { userId: { in: memberIds } }, select: { userId: true, username: true } });
    const usernameById = new Map(profiles.map((p) => [p.userId, p.username]));
    const nameById = new Map(league.members.map((m) => [m.userId, m.user.name]));
    const displayName = (id: string) => usernameById.get(id) ?? nameById.get(id) ?? "Member";

    const keys = JSON.parse(league.statsConfig) as string[];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const period = currentPeriod(league.startDate, today, league.matchupDays);
    const periodStart = new Date(league.startDate);
    periodStart.setUTCDate(periodStart.getUTCDate() + period * league.matchupDays);
    const periodEnd = new Date(periodStart);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + league.matchupDays);

    const values = await computeCategoryValues(memberIds, periodStart, periodEnd, keys);
    const pairings = pairRound(memberIds, period);

    // Score each pairing; tally points for standings.
    const points = new Map<string, number>();
    for (const id of memberIds) points.set(id, 0);
    let yourMatchup: unknown = null;

    for (const [a, b] of pairings) {
      if (b === null) {
        // bye
        if (a === session.user.id) yourMatchup = { bye: true };
        continue;
      }
      const cats: CategoryInput[] = keys.map((k) => ({
        key: k,
        label: CATEGORY_LABELS[k] ?? k,
        valueA: values.get(a)![k] ?? 0,
        valueB: values.get(b)![k] ?? 0,
      }));
      const score = scoreMatchup(cats);
      points.set(a, (points.get(a) ?? 0) + score.aPoints);
      points.set(b, (points.get(b) ?? 0) + score.bPoints);

      if (a === session.user.id || b === session.user.id) {
        const meIsA = a === session.user.id;
        const opp = meIsA ? b : a;
        yourMatchup = {
          opponent: displayName(opp),
          myPoints: meIsA ? score.aPoints : score.bPoints,
          oppPoints: meIsA ? score.bPoints : score.aPoints,
          result: score.winner === "tie" ? "tie" : (score.winner === "a") === meIsA ? "winning" : "losing",
          categories: score.categories.map((c) => ({
            label: c.label,
            myValue: meIsA ? c.valueA : c.valueB,
            oppValue: meIsA ? c.valueB : c.valueA,
            winning: c.winner === "tie" ? "tie" : (c.winner === "a") === meIsA,
          })),
        };
      }
    }

    const standings = memberIds
      .map((id) => ({ name: displayName(id), isMe: id === session.user.id, points: Math.round((points.get(id) ?? 0) * 10) / 10 }))
      .sort((x, y) => y.points - x.points)
      .map((s, i) => ({ rank: i + 1, ...s }));

    return successResponse({
      id: league.id,
      name: league.name,
      joinCode: league.ownerId === session.user.id ? league.joinCode : null,
      memberCount: memberIds.length,
      period: period + 1,
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      categories: keys.map((k) => CATEGORY_LABELS[k] ?? k),
      yourMatchup,
      standings,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/championship/[id] — leave the league (owner deletes it entirely). */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const league = await db.championshipLeague.findUnique({ where: { id: params.id }, select: { ownerId: true } });
    if (!league) return errorResponse("League not found", 404);

    if (league.ownerId === session.user.id) {
      await db.championshipLeague.delete({ where: { id: params.id } });
    } else {
      await db.championshipMember.deleteMany({ where: { leagueId: params.id, userId: session.user.id } });
    }
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
