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
import { createWorkoutPresetSchema } from "@/lib/validations/presets";

export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const presets = await db.workoutPreset.findMany({
      where: { userId: session.user.id },
      include: { exercises: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "asc" },
    });

    return successResponse({
      presets: presets.map((p) => ({
        ...p,
        recurringDays: JSON.parse(p.recurringDays) as number[],
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = createWorkoutPresetSchema.parse(body);

    const preset = await db.workoutPreset.create({
      data: {
        userId: session.user.id,
        name: data.name,
        recurringDays: JSON.stringify(data.recurringDays),
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

    return successResponse(
      {
        preset: { ...preset, recurringDays: JSON.parse(preset.recurringDays) as number[] },
      },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
