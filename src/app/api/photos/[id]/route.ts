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

/**
 * GET /api/photos/[id]
 * Return a single photo's image data, but only to its owner. This is the
 * auth + ownership-checked access path (the local stand-in for a signed URL).
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const photo = await db.progressPhoto.findUnique({ where: { id: params.id } });
    if (!photo || photo.userId !== session.user.id) {
      // Do not distinguish "not found" from "not yours".
      return errorResponse("Photo not found", 404);
    }

    return successResponse({ id: photo.id, date: photo.date.toISOString().slice(0, 10), dataUrl: photo.dataUrl });
  } catch (err) {
    return handleApiError(err);
  }
}
