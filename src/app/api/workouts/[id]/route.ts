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
import { updateWorkoutSchema, workoutIdSchema } from "@/lib/validations/workout";

/**
 * GET /api/workouts/[id]
 *
 * SECURITY: Ownership check — users can only access their own workouts.
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

    const { id } = workoutIdSchema.parse(params);

    const workout = await db.workout.findUnique({
      where: { id },
      include: { exercises: { orderBy: { order: "asc" } } },
    });

    // Ownership check — return 404 (not 403) to prevent IDOR enumeration
    if (!workout || workout.userId !== session.user.id) {
      return errorResponse("Workout not found", 404);
    }

    return successResponse({ workout });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PUT /api/workouts/[id]
 *
 * SECURITY: Ownership check + strict validation.
 * Exercises are replaced entirely on update (delete-then-create).
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

    const { id } = workoutIdSchema.parse(params);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = updateWorkoutSchema.parse(body);

    // Verify ownership before mutating
    const existing = await db.workout.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== session.user.id) {
      return errorResponse("Workout not found", 404);
    }

    // If exercises provided, replace all exercises in a transaction
    const workout = await db.$transaction(async (tx) => {
      if (data.exercises) {
        await tx.exercise.deleteMany({ where: { workoutId: id } });
      }
      return tx.workout.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.durationMin !== undefined && { durationMin: data.durationMin }),
          ...(data.date !== undefined && { date: data.date }),
          ...(data.exercises && {
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
          }),
        },
        include: { exercises: { orderBy: { order: "asc" } } },
      });
    });

    return successResponse({ workout });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/workouts/[id]
 *
 * SECURITY: Ownership check before deletion.
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

    const { id } = workoutIdSchema.parse(params);

    const existing = await db.workout.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== session.user.id) {
      return errorResponse("Workout not found", 404);
    }

    await db.workout.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
