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
import { syncWearableSchema } from "@/lib/validations/wearable";

/**
 * POST /api/wearables/sync
 * Trigger a manual sync of wearable data.
 *
 * SECURITY:
 *  - Rate limited (wearableSync tier: 10/min) to prevent API abuse.
 *  - Ownership check on wearable connection.
 *  - Provider API calls would happen server-side with stored tokens.
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.wearableSync.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = syncWearableSchema.parse(body);

    // Verify the user has an active connection for this provider
    const connection = await db.wearableConnection.findUnique({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: data.provider,
        },
      },
    });

    if (!connection || !connection.isActive) {
      return errorResponse("No active connection for this provider", 404);
    }

    // TODO: Call the provider API to fetch latest data
    // TODO: Parse and validate the response
    // TODO: Store new health metrics via db.healthMetric.createMany()
    // TODO: Update connection.lastSyncAt

    await db.wearableConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    return successResponse({ synced: true, provider: data.provider });
  } catch (err) {
    return handleApiError(err);
  }
}
