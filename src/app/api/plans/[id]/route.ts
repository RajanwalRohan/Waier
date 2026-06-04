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
import { updatePlanSchema } from "@/lib/validations/plans";

/** PATCH /api/plans/[id] — update plan status. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const { status } = updatePlanSchema.parse(body);

    await db.plan.updateMany({ where: { id: params.id, userId: session.user.id }, data: { status } });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/plans/[id] — remove a plan and its items. */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    await db.plan.deleteMany({ where: { id: params.id, userId: session.user.id } });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
