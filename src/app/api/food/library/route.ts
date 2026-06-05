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
import { savePersonalFoodSchema } from "@/lib/validations/food";

/** POST /api/food/library — remember a food by barcode for instant reuse. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const data = savePersonalFoodSchema.parse(body);

    await db.personalFood.upsert({
      where: { userId_barcode: { userId: session.user.id, barcode: data.barcode } },
      create: { userId: session.user.id, ...data },
      update: { ...data },
    });

    return successResponse({ ok: true }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
