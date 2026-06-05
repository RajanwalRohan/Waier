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
import { parseCsv, normalizeImportRows, dedupeKey } from "@/lib/import";

const MAX_ROWS = 20000;

/** GET /api/import — recent import jobs. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.general.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const jobs = await db.importJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return successResponse({
      jobs: jobs.map((j) => ({
        id: j.id,
        source: j.source,
        imported: j.imported,
        skipped: j.skipped,
        errors: j.errors,
        date: j.createdAt.toISOString().slice(0, 10),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/import — parse CSV, dedupe against existing data, and ingest. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${getClientIp(request)}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = (await parseBody(request)) as { csv?: string; source?: string } | null;
    if (!body?.csv || typeof body.csv !== "string") return errorResponse("Provide CSV text", 400);

    const { rows, errors } = normalizeImportRows(parseCsv(body.csv));
    if (rows.length === 0) {
      return errorResponse(
        errors > 0 ? "No valid rows. Check that columns include type, value, and date." : "No rows found.",
        400,
      );
    }
    if (rows.length > MAX_ROWS) return errorResponse(`Too many rows (max ${MAX_ROWS}).`, 400);

    // Date range of the import, to scope the dedupe query.
    const dates = rows.map((r) => r.date).sort();
    const minDate = new Date(dates[0]);
    const maxDate = new Date(dates[dates.length - 1]);
    maxDate.setUTCDate(maxDate.getUTCDate() + 1);

    const existing = await db.healthMetric.findMany({
      where: { userId: session.user.id, date: { gte: minDate, lt: maxDate } },
      select: { type: true, value: true, date: true },
    });
    const seen = new Set(existing.map((e) => dedupeKey({ type: e.type, value: e.value, date: e.date.toISOString().slice(0, 10) })));

    // Dedupe against existing and within the batch itself.
    const toInsert: typeof rows = [];
    for (const r of rows) {
      const key = dedupeKey(r);
      if (seen.has(key)) continue;
      seen.add(key);
      toInsert.push(r);
    }
    const skipped = rows.length - toInsert.length;

    if (toInsert.length > 0) {
      await db.healthMetric.createMany({
        data: toInsert.map((r) => ({
          userId: session.user.id,
          type: r.type,
          value: r.value,
          unit: r.unit ?? "",
          source: "import",
          date: new Date(r.date),
        })),
      });
    }

    const source = (body.source ?? "csv").slice(0, 30);
    await db.importJob.create({
      data: { userId: session.user.id, source, imported: toInsert.length, skipped, errors },
    });

    return successResponse({ imported: toInsert.length, skipped, errors, total: rows.length }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
