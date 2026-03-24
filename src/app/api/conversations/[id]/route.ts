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
import { cuidSchema } from "@/lib/validations/common";

/**
 * GET /api/conversations/[id]
 * Fetch a single conversation with all messages.
 *
 * SECURITY: Ownership check prevents reading other users' AI history.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const id = cuidSchema.parse(params.id);

    const conversation = await db.aIConversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return errorResponse("Conversation not found", 404);
    }

    return successResponse({ conversation });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/conversations/[id]
 * Delete a conversation and all its messages.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const id = cuidSchema.parse(params.id);

    const conversation = await db.aIConversation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!conversation || conversation.userId !== session.user.id) {
      return errorResponse("Conversation not found", 404);
    }

    await db.aIConversation.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
