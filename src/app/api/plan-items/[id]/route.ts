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
import { togglePlanItemSchema } from "@/lib/validations/plans";

/** PATCH /api/plan-items/[id] — mark a plan item done or not done. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const { completed } = togglePlanItemSchema.parse(body);

    // Scope by the parent plan's owner so users can only toggle their own items.
    await db.planItem.updateMany({
      where: { id: params.id, plan: { userId: session.user.id } },
      data: { completed },
    });

    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
