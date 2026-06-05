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
import { setUsernameSchema, privacySchema } from "@/lib/validations/social";
import { resolvePrivacy, normalizeUsername } from "@/lib/social";
import { getProfilePayload } from "@/lib/social-data";

/** GET /api/social — my username, privacy settings, and my own profile payload. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const [profile, payload] = await Promise.all([
      db.profile.findUnique({ where: { userId: session.user.id }, select: { username: true, privacySettings: true } }),
      getProfilePayload(session.user.id),
    ]);

    return successResponse({
      username: profile?.username ?? null,
      privacy: resolvePrivacy(profile?.privacySettings),
      profile: payload,
      name: session.user.name ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/social — claim or change your public username. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const { username } = setUsernameSchema.parse(body);

    const handle = normalizeUsername(username);
    if (!handle) return errorResponse("Username must be 3-20 letters, numbers, or underscores", 400);

    const taken = await db.profile.findUnique({ where: { username: handle }, select: { userId: true } });
    if (taken && taken.userId !== session.user.id) return errorResponse("That username is taken", 409);

    await db.profile.update({ where: { userId: session.user.id }, data: { username: handle } });
    return successResponse({ username: handle });
  } catch (err) {
    return handleApiError(err);
  }
}

/** PATCH /api/social — update privacy settings (merged with existing). */
export async function PATCH(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const partial = privacySchema.parse(body);

    const existing = await db.profile.findUnique({ where: { userId: session.user.id }, select: { privacySettings: true } });
    const merged = { ...resolvePrivacy(existing?.privacySettings), ...partial };

    await db.profile.update({ where: { userId: session.user.id }, data: { privacySettings: JSON.stringify(merged) } });
    return successResponse({ privacy: merged });
  } catch (err) {
    return handleApiError(err);
  }
}
