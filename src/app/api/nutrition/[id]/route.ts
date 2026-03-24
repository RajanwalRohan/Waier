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
import { updateMealSchema, mealIdSchema } from "@/lib/validations/nutrition";

/**
 * GET /api/nutrition/[id]
 * SECURITY: Ownership check prevents IDOR.
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

    const { id } = mealIdSchema.parse(params);

    const meal = await db.meal.findUnique({ where: { id } });
    if (!meal || meal.userId !== session.user.id) {
      return errorResponse("Meal not found", 404);
    }

    return successResponse({ meal });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PUT /api/nutrition/[id]
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const { id } = mealIdSchema.parse(params);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = updateMealSchema.parse(body);

    const existing = await db.meal.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== session.user.id) {
      return errorResponse("Meal not found", 404);
    }

    const meal = await db.meal.update({
      where: { id },
      data,
    });

    return successResponse({ meal });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/nutrition/[id]
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

    const { id } = mealIdSchema.parse(params);

    const existing = await db.meal.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== session.user.id) {
      return errorResponse("Meal not found", 404);
    }

    await db.meal.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
