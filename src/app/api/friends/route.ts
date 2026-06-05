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
import { friendRequestSchema, friendActionSchema } from "@/lib/validations/social";
import { rankByFlow, resolvePrivacy, normalizeUsername } from "@/lib/social";

interface PersonLite {
  userId: string;
  name: string | null;
  username: string | null;
  flow: number | null;
  tier: string | null;
}

async function hydratePeople(ids: string[]): Promise<Map<string, PersonLite>> {
  const map = new Map<string, PersonLite>();
  if (ids.length === 0) return map;

  const [profiles, users, scores] = await Promise.all([
    db.profile.findMany({ where: { userId: { in: ids } }, select: { userId: true, username: true, privacySettings: true } }),
    db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    db.dailyScore.findMany({ where: { userId: { in: ids } }, orderBy: { date: "desc" }, select: { userId: true, flow: true, tier: true } }),
  ]);

  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const profById = new Map(profiles.map((p) => [p.userId, p]));
  const latestScore = new Map<string, { flow: number; tier: string }>();
  for (const s of scores) if (!latestScore.has(s.userId)) latestScore.set(s.userId, { flow: s.flow, tier: s.tier });

  for (const id of ids) {
    const prof = profById.get(id);
    const showFlow = resolvePrivacy(prof?.privacySettings).showFlow;
    const score = latestScore.get(id);
    map.set(id, {
      userId: id,
      name: nameById.get(id) ?? null,
      username: prof?.username ?? null,
      flow: showFlow && score ? Math.round(score.flow) : null,
      tier: showFlow && score ? score.tier : null,
    });
  }
  return map;
}

/** GET /api/friends — friends, pending requests, and a friends leaderboard by Flow. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const me = session.user.id;
    const links = await db.friendship.findMany({
      where: { OR: [{ userId: me }, { friendId: me }] },
    });

    const friendIds: string[] = [];
    const incoming: Array<{ id: string; otherId: string }> = [];
    const outgoing: Array<{ id: string; otherId: string }> = [];
    for (const l of links) {
      const other = l.userId === me ? l.friendId : l.userId;
      if (l.status === "accepted") friendIds.push(other);
      else if (l.status === "pending") {
        if (l.friendId === me) incoming.push({ id: l.id, otherId: other });
        else outgoing.push({ id: l.id, otherId: other });
      }
    }

    const allIds = Array.from(new Set([me, ...friendIds, ...incoming.map((i) => i.otherId), ...outgoing.map((o) => o.otherId)]));
    const people = await hydratePeople(allIds);

    // Leaderboard: me + accepted friends, ranked by Flow.
    const board = rankByFlow([me, ...friendIds].map((id) => ({ userId: id, flow: people.get(id)?.flow ?? null })));

    return successResponse({
      friends: friendIds.map((id) => people.get(id)),
      incoming: incoming.map((i) => ({ requestId: i.id, ...people.get(i.otherId) })),
      outgoing: outgoing.map((o) => ({ requestId: o.id, ...people.get(o.otherId) })),
      leaderboard: board.map((b) => ({ rank: b.rank, isMe: b.item.userId === me, ...people.get(b.item.userId) })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/friends — send a friend request by username. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const { username } = friendRequestSchema.parse(body);

    const handle = normalizeUsername(username);
    if (!handle) return errorResponse("Enter a valid username", 400);

    const target = await db.profile.findUnique({ where: { username: handle }, select: { userId: true } });
    if (!target) return errorResponse("No user with that username", 404);
    if (target.userId === session.user.id) return errorResponse("You cannot add yourself", 400);

    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId: target.userId },
          { userId: target.userId, friendId: session.user.id },
        ],
      },
    });
    if (existing) return errorResponse("You are already connected or have a pending request", 409);

    await db.friendship.create({ data: { userId: session.user.id, friendId: target.userId, status: "pending" } });
    return successResponse({ ok: true }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

/** PATCH /api/friends — accept or decline an incoming request. */
export async function PATCH(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const { id, action } = friendActionSchema.parse(body);

    // Only the recipient of a pending request may act on it.
    const link = await db.friendship.findFirst({ where: { id, friendId: session.user.id, status: "pending" } });
    if (!link) return errorResponse("Request not found", 404);

    if (action === "accept") {
      await db.friendship.update({ where: { id }, data: { status: "accepted" } });
    } else {
      await db.friendship.delete({ where: { id } });
    }
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/friends?id=... — remove a friendship (either party). */
export async function DELETE(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse("Missing id", 400);

    await db.friendship.deleteMany({
      where: { id, OR: [{ userId: session.user.id }, { friendId: session.user.id }] },
    });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
