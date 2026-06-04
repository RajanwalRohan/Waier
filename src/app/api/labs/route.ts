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
import { labResultSchema } from "@/lib/validations/medical";
import { evaluateLab, labTrend } from "@/lib/labs";

/** GET /api/labs — lab results grouped by test, with latest value, status, and trend. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const results = await db.labResult.findMany({
      where: { userId: session.user.id },
      orderBy: { collectedAt: "asc" },
    });

    const byTest = new Map<string, typeof results>();
    for (const r of results) {
      const arr = byTest.get(r.testName) ?? [];
      arr.push(r);
      byTest.set(r.testName, arr);
    }

    const tests = Array.from(byTest.entries()).map(([testName, rows]) => {
      const latest = rows[rows.length - 1];
      const series = rows.map((r) => ({ date: r.collectedAt.toISOString().slice(0, 10), value: r.value }));
      return {
        testName,
        unit: latest.unit,
        panel: latest.panel,
        latest: latest.value,
        latestId: latest.id,
        refRangeLow: latest.refRangeLow,
        refRangeHigh: latest.refRangeHigh,
        status: evaluateLab(latest.value, latest.refRangeLow, latest.refRangeHigh),
        trend: labTrend(rows.map((r) => r.value)),
        series,
      };
    });

    return successResponse({ tests });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/labs — add a lab result. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const data = labResultSchema.parse(body);

    await db.labResult.create({
      data: { userId: session.user.id, ...data, collectedAt: data.collectedAt ?? new Date() },
    });
    return successResponse({ ok: true }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/labs?id=... */
export async function DELETE(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse("Missing id", 400);

    await db.labResult.deleteMany({ where: { id, userId: session.user.id } });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
