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
import { updateProfileSchema } from "@/lib/validations/profile";

/**
 * GET /api/profile
 * Fetch the authenticated user's profile.
 *
 * SECURITY:
 *  - Requires authentication.
 *  - Rate limited (general tier).
 *  - Only returns the requesting user's own data (no IDOR).
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, image: true, createdAt: true },
    });

    return successResponse({ user, profile });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PUT /api/profile
 * Update the authenticated user's profile.
 *
 * SECURITY:
 *  - Requires authentication.
 *  - Rate limited (mutation tier).
 *  - Strict schema validation — only allowlisted fields accepted.
 *  - userId always comes from session, never from the request body.
 */
export async function PUT(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = updateProfileSchema.parse(body);

    // Separate user-level fields from profile fields
    const { name, dietaryPreferences, ...profileFields } = data;

    if (name !== undefined) {
      await db.user.update({
        where: { id: session.user.id },
        data: { name },
      });
    }

    // SQLite stores arrays as JSON strings
    const profileData = {
      ...profileFields,
      ...(dietaryPreferences !== undefined
        ? { dietaryPreferences: JSON.stringify(dietaryPreferences) }
        : {}),
    };

    const profile = await db.profile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...profileData },
      update: profileData,
    });

    return successResponse({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
