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
import { updateWorkoutPresetSchema, presetIdSchema } from "@/lib/validations/presets";

type Ctx = { params: { id: string } };

export async function PUT(request: Request, { params }: Ctx) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const { id } = presetIdSchema.parse(params);

    const existing = await db.workoutPreset.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return errorResponse("Not found", 404);
    }

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = updateWorkoutPresetSchema.parse(body);

    const preset = await db.$transaction(async (tx) => {
      if (data.exercises) {
        await tx.presetExercise.deleteMany({ where: { presetId: id } });
      }
      return tx.workoutPreset.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.recurringDays !== undefined
            ? { recurringDays: JSON.stringify(data.recurringDays) }
            : {}),
          ...(data.exercises
            ? {
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
              }
            : {}),
        },
        include: { exercises: { orderBy: { order: "asc" } } },
      });
    });

    return successResponse({
      preset: { ...preset, recurringDays: JSON.parse(preset.recurringDays) as number[] },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const { id } = presetIdSchema.parse(params);

    const existing = await db.workoutPreset.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return errorResponse("Not found", 404);
    }

    await db.workoutPreset.delete({ where: { id } });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
