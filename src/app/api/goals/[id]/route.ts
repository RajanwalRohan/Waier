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
import { updateGoalSchema } from "@/lib/validations/goals";

/** PATCH /api/goals/[id] — update a goal's status (pause, resume, abandon, complete). */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const { status } = updateGoalSchema.parse(body);

    await db.goal.updateMany({
      where: { id: params.id, userId: session.user.id },
      data: { status, completedAt: status === "completed" ? new Date() : null },
    });

    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/goals/[id] — remove a goal. */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    await db.goal.deleteMany({ where: { id: params.id, userId: session.user.id } });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
