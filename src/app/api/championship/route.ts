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
import { createLeagueSchema } from "@/lib/validations/championship";
import { generateJoinCode } from "@/lib/championship";
import { DEFAULT_CATEGORIES } from "@/lib/championship-data";

/** GET /api/championship — leagues the user belongs to (summaries). */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const memberships = await db.championshipMember.findMany({
      where: { userId: session.user.id },
      include: { league: { include: { _count: { select: { members: true } } } } },
    });

    return successResponse({
      leagues: memberships.map((m) => ({
        id: m.league.id,
        name: m.league.name,
        joinCode: m.league.joinCode,
        memberCount: m.league._count.members,
        isOwner: m.league.ownerId === session.user.id,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/championship — create a league (creator joins automatically). */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const data = createLeagueSchema.parse(body);

    // Unique join code (retry on the rare collision).
    let joinCode = generateJoinCode();
    for (let i = 0; i < 5; i++) {
      const clash = await db.championshipLeague.findUnique({ where: { joinCode }, select: { id: true } });
      if (!clash) break;
      joinCode = generateJoinCode();
    }

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const league = await db.championshipLeague.create({
      data: {
        name: data.name,
        joinCode,
        ownerId: session.user.id,
        statsConfig: JSON.stringify(DEFAULT_CATEGORIES.map((c) => c.key)),
        startDate: start,
        matchupDays: data.matchupDays ?? 14,
        members: { create: { userId: session.user.id } },
      },
    });

    return successResponse({ id: league.id, joinCode: league.joinCode }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
