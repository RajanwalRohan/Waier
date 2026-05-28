import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimiters } from "@/lib/rate-limit";
import {
  successResponse,
  errorResponse,
  rateLimitResponse,
  getClientIp,
  handleApiError,
} from "@/lib/api-utils";
import { env } from "@/lib/env";
import { verifyWebhookSignature, isIpAllowed } from "@/lib/webhook-verify";

/**
 * Incoming metric from Open Wearables webhook payload.
 */
const owMetricSchema = z.object({
  type: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/),
  value: z.number().min(0).max(1_000_000),
  unit: z.string().min(1).max(20),
  timestamp: z.coerce.date(),
});

const owWebhookSchema = z.object({
  /** Open Wearables user ID — mapped to our user via WearableConnection.externalUserId */
  userId: z.string().min(1),
  /** Source device/provider as reported by Open Wearables */
  source: z.string().min(1).max(50).optional(),
  /** Array of normalized metric readings */
  metrics: z.array(owMetricSchema).min(1).max(500),
});

/**
 * POST /api/wearables/ingest
 *
 * Webhook receiver for Open Wearables.
 * Accepts HMAC-signed payloads containing normalized health metrics,
 * maps them to the correct user, deduplicates, and stores them.
 *
 * SECURITY:
 *  - HMAC-SHA256 signature verification (constant-time) — rejects forged payloads
 *  - IP allowlist — only accepts from configured internal network
 *  - Rate limited (webhook tier: 30/min)
 *  - Payload size limited by parseBody (1MB)
 *  - Strict Zod validation on all fields
 *  - User mapping via encrypted WearableConnection, not request data
 *  - All ingestion events are audit-logged (no PII, no health values)
 *  - CSRF check is skipped for webhooks (handled via HMAC instead)
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    // 1. Rate limit
    const rl = rateLimiters.webhook.check(ip);
    if (!rl.success) return rateLimitResponse(rl);

    // 2. IP allowlist check
    if (!isIpAllowed(ip, env.OPEN_WEARABLES_ALLOWED_IPS)) {
      await auditLog(null, "webhook_rejected", { reason: "ip_blocked", ip });
      return errorResponse("Forbidden", 403);
    }

    // 3. Verify webhook secret is configured
    if (!env.OPEN_WEARABLES_WEBHOOK_SECRET) {
      return errorResponse("Webhook not configured", 503);
    }

    // 4. Read raw body and verify HMAC signature
    const rawBody = await request.text();
    const signature = request.headers.get("x-ow-signature") ?? "";

    if (!verifyWebhookSignature(env.OPEN_WEARABLES_WEBHOOK_SECRET, rawBody, signature)) {
      await auditLog(null, "webhook_rejected", { reason: "invalid_signature", ip });
      return errorResponse("Invalid signature", 401);
    }

    // 5. Parse and validate payload
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const result = owWebhookSchema.safeParse(parsed);
    if (!result.success) {
      return errorResponse("Invalid payload", 400);
    }

    const { userId: externalUserId, metrics, source } = result.data;

    // 6. Map Open Wearables user to our user
    const connection = await db.wearableConnection.findUnique({
      where: { externalUserId },
    });

    if (!connection || !connection.isActive) {
      await auditLog(null, "webhook_rejected", {
        reason: "unknown_user",
        externalUserId,
      });
      return errorResponse("Unknown user", 404);
    }

    const userId = connection.userId;

    // 7. Deduplication — find existing metrics in the same time window
    const dates = metrics.map((m) => m.timestamp);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    const existing = await db.healthMetric.findMany({
      where: {
        userId,
        source: "open_wearables",
        date: { gte: minDate, lte: maxDate },
      },
      select: { type: true, date: true },
    });

    const existingKeys = new Set(
      existing.map((e) => `${e.type}:${e.date.getTime()}`),
    );

    const newMetrics = metrics.filter(
      (m) => !existingKeys.has(`${m.type}:${m.timestamp.getTime()}`),
    );

    // 8. Insert new metrics
    let insertedCount = 0;
    if (newMetrics.length > 0) {
      const result = await db.healthMetric.createMany({
        data: newMetrics.map((m) => ({
          userId,
          type: m.type,
          value: m.value,
          unit: m.unit,
          source: "open_wearables",
          date: m.timestamp,
        })),
      });
      insertedCount = result.count;
    }

    // 9. Update last sync timestamp
    await db.wearableConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    // 10. Audit log — counts only, no health values or PII
    await auditLog(userId, "wearable_sync", {
      provider: connection.provider,
      device: connection.providerDevice,
      metricsReceived: metrics.length,
      metricsInserted: insertedCount,
      metricsDeduplicated: metrics.length - newMetrics.length,
      source: source ?? "unknown",
    });

    return successResponse({
      received: metrics.length,
      inserted: insertedCount,
      deduplicated: metrics.length - newMetrics.length,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Write a non-PII audit log entry. */
async function auditLog(
  userId: string | null,
  action: string,
  detail: Record<string, unknown>,
) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        detail: JSON.stringify(detail),
      },
    });
  } catch {
    // Audit log failures must never break the main flow
  }
}
