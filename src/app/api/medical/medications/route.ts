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
import { medicationSchema } from "@/lib/validations/medical";

/** GET /api/medical/medications — list active medications. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const meds = await db.medication.findMany({
      where: { userId: session.user.id, active: true },
      orderBy: { createdAt: "desc" },
    });

    return successResponse({
      medications: meds.map((m) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        prescriber: m.prescriber,
        reminderEnabled: m.reminderEnabled,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/medical/medications — add a medication. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const data = medicationSchema.parse(body);

    await db.medication.create({ data: { userId: session.user.id, ...data } });
    return successResponse({ ok: true }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/medical/medications?id=... */
export async function DELETE(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse("Missing id", 400);

    await db.medication.deleteMany({ where: { id, userId: session.user.id } });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
