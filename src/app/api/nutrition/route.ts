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
import { createMealSchema } from "@/lib/validations/nutrition";
import { paginationSchema, dateRangeSchema } from "@/lib/validations/common";

/**
 * GET /api/nutrition
 * List the authenticated user's meals with pagination and date filtering.
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const { page, limit } = paginationSchema.parse(params);
    const dateRange = dateRangeSchema.parse(params);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (dateRange.from || dateRange.to) {
      where.date = {
        ...(dateRange.from && { gte: dateRange.from }),
        ...(dateRange.to && { lte: dateRange.to }),
      };
    }

    const [meals, total] = await Promise.all([
      db.meal.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.meal.count({ where }),
    ]);

    return successResponse({ meals, total, page, limit });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/nutrition
 * Log a new meal.
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = createMealSchema.parse(body);

    const meal = await db.meal.create({
      data: {
        userId: session.user.id,
        ...data,
      },
    });

    return successResponse({ meal }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
