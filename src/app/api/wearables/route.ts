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

/**
 * GET /api/wearables
 *
 * List the authenticated user's wearable connections.
 * Returns provider, device name, status, and last sync time.
 * Never returns tokens or sensitive connection details.
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const connections = await db.wearableConnection.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        providerDevice: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse({ connections });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/wearables
 *
 * Disconnect a wearable connection by ID.
 * Body: { connectionId: string }
 *
 * SECURITY:
 *  - Ownership check ensures users can only disconnect their own devices
 *  - Tokens are wiped on disconnect
 *  - Audit logged
 */
export async function DELETE(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body || typeof (body as Record<string, unknown>).connectionId !== "string") {
      return errorResponse("connectionId is required", 400);
    }

    const connectionId = (body as Record<string, unknown>).connectionId as string;

    // Fetch and verify ownership
    const connection = await db.wearableConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.userId !== session.user.id) {
      return errorResponse("Connection not found", 404);
    }

    // Deactivate and wipe tokens
    await db.wearableConnection.update({
      where: { id: connectionId },
      data: {
        isActive: false,
        accessToken: "REVOKED",
        refreshToken: null,
      },
    });

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "connection_revoked",
          detail: JSON.stringify({
            provider: connection.provider,
            device: connection.providerDevice,
          }),
          ip,
        },
      });
    } catch {
      // Audit log failures must never break the main flow
    }

    return successResponse({ disconnected: true, provider: connection.provider });
  } catch (err) {
    return handleApiError(err);
  }
}
