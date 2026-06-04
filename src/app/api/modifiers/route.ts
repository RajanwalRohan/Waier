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
import { addModifierSchema } from "@/lib/validations/intake";

/** GET /api/modifiers — today's modifiers, newest first. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const mods = await db.modifier.findMany({
      where: { userId: session.user.id, takenAt: { gte: today } },
      orderBy: { takenAt: "desc" },
    });

    return successResponse({
      modifiers: mods.map((m) => ({
        id: m.id,
        kind: m.kind,
        name: m.name,
        amount: m.amount,
        unit: m.unit,
        takenAt: m.takenAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/modifiers — log a caffeine / alcohol / supplement / sleep-aid entry. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const data = addModifierSchema.parse(body);

    await db.modifier.create({ data: { userId: session.user.id, takenAt: new Date(), ...data } });
    return successResponse({ ok: true }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/modifiers?id=... — remove a logged modifier. */
export async function DELETE(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse("Missing id", 400);

    await db.modifier.deleteMany({ where: { id, userId: session.user.id } });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
