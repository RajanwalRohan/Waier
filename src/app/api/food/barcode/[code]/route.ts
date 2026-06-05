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
import { normalizeOffProduct, isValidBarcode, type NormalizedFood } from "@/lib/food";

const OFF_FIELDS = "product_name,generic_name,brands,serving_size,nutriments";

/**
 * GET /api/food/barcode/[code]
 * Resolve a barcode to food macros: the user's personal library first, then
 * Open Food Facts. Returns { found:false } when neither has it so the client
 * can offer a one-time manual add.
 */
export async function GET(request: Request, { params }: { params: { code: string } }) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const code = params.code.trim();
    if (!isValidBarcode(code)) return errorResponse("Invalid barcode", 400);

    // 1) Personal library
    const personal = await db.personalFood.findUnique({
      where: { userId_barcode: { userId: session.user.id, barcode: code } },
    });
    if (personal) {
      return successResponse({
        source: "library",
        food: {
          found: true,
          barcode: code,
          name: personal.name,
          serving: personal.serving ?? undefined,
          calories: personal.calories,
          proteinG: personal.proteinG,
          carbsG: personal.carbsG,
          fatG: personal.fatG,
          fiberG: personal.fiberG,
        } satisfies NormalizedFood,
      });
    }

    // 2) Open Food Facts
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, {
        headers: { "User-Agent": "Waier/1.0 (health app)" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        const food = normalizeOffProduct(json, code);
        if (food.found) return successResponse({ source: "off", food });
      }
    } catch {
      // Network failure or timeout: fall through to not-found.
    }

    return successResponse({ source: "none", food: { found: false, barcode: code } satisfies NormalizedFood });
  } catch (err) {
    return handleApiError(err);
  }
}
