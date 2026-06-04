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
import { medicalRecordSchema } from "@/lib/validations/medical";

/** GET /api/medical/records[?type=] — list procedures / vaccines / doctor visits. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const type = new URL(request.url).searchParams.get("type") ?? undefined;
    const records = await db.medicalRecord.findMany({
      where: { userId: session.user.id, ...(type ? { type } : {}) },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return successResponse({
      records: records.map((r) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        date: r.date ? r.date.toISOString().slice(0, 10) : null,
        providerName: r.providerName,
        detail: r.detail,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/medical/records — add a procedure / vaccine / doctor visit. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const data = medicalRecordSchema.parse(body);

    await db.medicalRecord.create({ data: { userId: session.user.id, ...data } });
    return successResponse({ ok: true }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/medical/records?id=... */
export async function DELETE(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse("Missing id", 400);

    await db.medicalRecord.deleteMany({ where: { id, userId: session.user.id } });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
