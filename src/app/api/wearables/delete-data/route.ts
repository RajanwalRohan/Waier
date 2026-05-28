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
import { deleteWearableDataSchema } from "@/lib/validations/wearable";

/**
 * POST /api/wearables/delete-data
 *
 * Delete health metric data by scope. Creates an audit log entry
 * and optionally deactivates wearable connections.
 *
 * SECURITY:
 *  - Authenticated users only
 *  - Rate limited (auth tier)
 *  - Scope strictly validated
 *  - Audit logged (no PII, no health values)
 *  - Only deletes data belonging to the authenticated user
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.auth.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const { scope } = deleteWearableDataSchema.parse(body);
    const userId = session.user.id;

    let metricsDeleted = 0;
    let connectionsDeactivated = 0;

    if (scope === "wearable_data") {
      // Delete only metrics sourced from wearables (not manual entries)
      const result = await db.healthMetric.deleteMany({
        where: {
          userId,
          source: { not: "manual" },
        },
      });
      metricsDeleted = result.count;

      // Deactivate all wearable connections
      const connResult = await db.wearableConnection.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
      connectionsDeactivated = connResult.count;
    } else {
      // Delete ALL health metrics (manual + wearable)
      const result = await db.healthMetric.deleteMany({
        where: { userId },
      });
      metricsDeleted = result.count;

      // Deactivate all wearable connections
      const connResult = await db.wearableConnection.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
      connectionsDeactivated = connResult.count;
    }

    // Create a data deletion request record
    await db.dataDeletionRequest.create({
      data: {
        userId,
        scope,
        status: "completed",
        completedAt: new Date(),
      },
    });

    // Audit log — counts only, no PII or health values
    try {
      await db.auditLog.create({
        data: {
          userId,
          action: "data_delete",
          detail: JSON.stringify({
            scope,
            metricsDeleted,
            connectionsDeactivated,
          }),
          ip,
        },
      });
    } catch {
      // Audit log failures must never break the main flow
    }

    return successResponse({
      scope,
      metricsDeleted,
      connectionsDeactivated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
