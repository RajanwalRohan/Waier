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
import { createHealthMetricSchema, healthMetricQuerySchema } from "@/lib/validations/health-metric";

/**
 * GET /api/health-metrics
 * Query the authenticated user's health metrics with filters.
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
    const query = healthMetricQuerySchema.parse(params);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.date = {
        ...(query.from && { gte: query.from }),
        ...(query.to && { lte: query.to }),
      };
    }

    const [metrics, total] = await Promise.all([
      db.healthMetric.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.healthMetric.count({ where }),
    ]);

    return successResponse({ metrics, total, page: query.page, limit: query.limit });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/health-metrics
 * Record a new health metric (manual entry or from wearable sync).
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

    const data = createHealthMetricSchema.parse(body);

    const metric = await db.healthMetric.create({
      data: {
        userId: session.user.id,
        ...data,
      },
    });

    return successResponse({ metric }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
