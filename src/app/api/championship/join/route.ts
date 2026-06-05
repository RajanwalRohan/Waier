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
import { joinLeagueSchema } from "@/lib/validations/championship";

/** POST /api/championship/join — join a league by its code. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const { joinCode } = joinLeagueSchema.parse(body);

    const league = await db.championshipLeague.findUnique({
      where: { joinCode: joinCode.toUpperCase() },
      select: { id: true, members: { where: { userId: session.user.id }, select: { id: true } } },
    });
    if (!league) return errorResponse("No league with that code", 404);
    if (league.members.length > 0) return errorResponse("You are already in this league", 409);

    await db.championshipMember.create({ data: { leagueId: league.id, userId: session.user.id } });
    return successResponse({ id: league.id }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
