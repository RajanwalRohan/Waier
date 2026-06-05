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
import { uploadPhotoSchema } from "@/lib/validations/photos";
import { safeEncrypt } from "@/lib/crypto";

/** GET /api/photos[?kind=] — metadata only (id, date, kind). The image bytes are
 *  fetched separately through the auth-gated /api/photos/[id] route. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const kind = new URL(request.url).searchParams.get("kind") ?? "body";
    const photos = await db.progressPhoto.findMany({
      where: { userId: session.user.id, kind },
      orderBy: { date: "asc" },
      select: { id: true, date: true, kind: true },
    });

    return successResponse({
      photos: photos.map((p) => ({ id: p.id, date: p.date.toISOString().slice(0, 10), kind: p.kind })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/photos — store today's photo (one per day per kind). */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.upload.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const data = uploadPhotoSchema.parse(body);

    const date = data.date ?? new Date();
    date.setUTCHours(0, 0, 0, 0);
    const kind = data.kind ?? "body";

    // One photo per day per kind: replace any existing same-day entry.
    const dayEnd = new Date(date);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    await db.progressPhoto.deleteMany({ where: { userId: session.user.id, kind, date: { gte: date, lt: dayEnd } } });
    // Encrypt the image at rest (AES-256-GCM). Strict tier.
    const photo = await db.progressPhoto.create({
      data: { userId: session.user.id, date, kind, dataUrl: safeEncrypt(data.dataUrl) },
      select: { id: true },
    });

    return successResponse({ id: photo.id }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/photos?id=... */
export async function DELETE(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse("Missing id", 400);

    await db.progressPhoto.deleteMany({ where: { id, userId: session.user.id } });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
