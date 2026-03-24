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
import { createWorkoutSchema } from "@/lib/validations/workout";
import { paginationSchema, dateRangeSchema } from "@/lib/validations/common";

/**
 * GET /api/workouts
 * List the authenticated user's workouts with pagination and date filtering.
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

    const [workouts, total] = await Promise.all([
      db.workout.findMany({
        where,
        include: { exercises: { orderBy: { order: "asc" } } },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.workout.count({ where }),
    ]);

    return successResponse({ workouts, total, page, limit });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/workouts
 * Create a new workout with exercises.
 *
 * SECURITY:
 *  - userId always from session.
 *  - Strict schema validation.
 *  - Exercise array capped at 100.
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

    const data = createWorkoutSchema.parse(body);

    const workout = await db.workout.create({
      data: {
        userId: session.user.id,
        name: data.name,
        notes: data.notes,
        durationMin: data.durationMin,
        date: data.date,
        exercises: {
          create: data.exercises.map((ex, i) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weightKg: ex.weightKg,
            durationSec: ex.durationSec,
            notes: ex.notes,
            order: ex.order ?? i,
          })),
        },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    return successResponse({ workout }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
