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
import { updateMealPresetSchema, presetIdSchema } from "@/lib/validations/presets";

type Ctx = { params: { id: string } };

export async function PUT(request: Request, { params }: Ctx) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const { id } = presetIdSchema.parse(params);

    const existing = await db.mealPreset.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return errorResponse("Not found", 404);
    }

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = updateMealPresetSchema.parse(body);

    const preset = await db.mealPreset.update({
      where: { id },
      data,
    });

    return successResponse({ preset });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const { id } = presetIdSchema.parse(params);

    const existing = await db.mealPreset.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return errorResponse("Not found", 404);
    }

    await db.mealPreset.delete({ where: { id } });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
