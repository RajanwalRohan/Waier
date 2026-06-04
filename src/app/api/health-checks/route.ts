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
import { detectAlerts, alertSummary, type MetricPoint, type AlertKind } from "@/lib/health-checks";

/**
 * GET /api/health-checks
 * Run detection over recent metrics (idempotent upsert), then return the
 * user's active findings, newest first.
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 14);

    const metrics = await db.healthMetric.findMany({
      where: { userId: session.user.id, date: { gte: since } },
      select: { type: true, value: true, date: true },
    });

    const candidates = detectAlerts(metrics as MetricPoint[]);
    // Upsert each candidate; never overwrite an existing status (so an
    // acknowledged/dismissed finding stays that way).
    await Promise.all(
      candidates.map((c) =>
        db.healthAlert.upsert({
          where: { userId_kind_detectedAt: { userId: session.user.id, kind: c.kind, detectedAt: c.detectedAt } },
          create: {
            userId: session.user.id,
            kind: c.kind,
            severity: c.severity,
            detectedAt: c.detectedAt,
            contextJson: JSON.stringify(c.context),
            status: "new",
          },
          update: {},
        }),
      ),
    );

    const alerts = await db.healthAlert.findMany({
      where: { userId: session.user.id, status: { in: ["new", "acknowledged"] } },
      orderBy: { detectedAt: "desc" },
      take: 20,
    });

    return successResponse({
      alerts: alerts.map((a) => {
        const ctx = a.contextJson ? JSON.parse(a.contextJson) : { value: 0, threshold: 0 };
        return {
          id: a.id,
          kind: a.kind,
          severity: a.severity,
          status: a.status,
          detectedAt: a.detectedAt.toISOString().slice(0, 10),
          summary: alertSummary(a.kind as AlertKind, ctx),
        };
      }),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/health-checks
 * Update a finding's status: { id, status: "acknowledged" | "dismissed" }.
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = (await parseBody(request)) as { id?: string; status?: string } | null;
    if (!body?.id || !body.status || !["acknowledged", "dismissed"].includes(body.status)) {
      return errorResponse("Invalid request body", 400);
    }

    await db.healthAlert.updateMany({
      where: { id: body.id, userId: session.user.id },
      data: { status: body.status },
    });

    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
