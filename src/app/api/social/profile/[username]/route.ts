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
import { resolvePrivacy, applyPrivacy } from "@/lib/social";
import { getProfilePayload } from "@/lib/social-data";

/**
 * GET /api/social/profile/[username]
 * A public profile, with the owner's privacy settings applied (unless you are
 * viewing your own).
 */
export async function GET(request: Request, { params }: { params: { username: string } }) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const profile = await db.profile.findUnique({
      where: { username: params.username.toLowerCase() },
      select: { userId: true, username: true, privacySettings: true, user: { select: { name: true } } },
    });
    if (!profile) return errorResponse("Profile not found", 404);

    const isSelf = profile.userId === session.user.id;
    const payload = await getProfilePayload(profile.userId);
    const visible = applyPrivacy(payload, resolvePrivacy(profile.privacySettings), isSelf);

    // Friendship status between viewer and this profile.
    let relationship: "self" | "friends" | "pending" | "none" = isSelf ? "self" : "none";
    if (!isSelf) {
      const link = await db.friendship.findFirst({
        where: {
          OR: [
            { userId: session.user.id, friendId: profile.userId },
            { userId: profile.userId, friendId: session.user.id },
          ],
        },
        select: { status: true },
      });
      if (link?.status === "accepted") relationship = "friends";
      else if (link?.status === "pending") relationship = "pending";
    }

    return successResponse({
      username: profile.username,
      name: profile.user.name,
      relationship,
      profile: visible,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
