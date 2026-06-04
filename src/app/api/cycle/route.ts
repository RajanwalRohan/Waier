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
import { logCycleSchema } from "@/lib/validations/cycle";
import { cycleStats } from "@/lib/cycle";

function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Pregnancy in the medical profile suspends cycle predictions. */
function isPregnant(medicalConditions: string | undefined): boolean {
  if (!medicalConditions) return false;
  try {
    const arr = JSON.parse(medicalConditions) as string[];
    return arr.some((c) => /pregnan/i.test(c));
  } catch {
    return false;
  }
}

/** GET /api/cycle — cycle stats, prediction, current phase, and recent log. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 180);

    const [profile, entries] = await Promise.all([
      db.profile.findUnique({ where: { userId: session.user.id }, select: { medicalConditions: true } }),
      db.cycleEntry.findMany({
        where: { userId: session.user.id, date: { gte: since } },
        orderBy: { date: "desc" },
      }),
    ]);

    const pregnant = isPregnant(profile?.medicalConditions);
    const periodStarts = entries.filter((e) => e.kind === "period_start").map((e) => e.date);
    const stats = pregnant ? null : cycleStats(periodStarts, todayUtc());

    return successResponse({
      pregnant,
      stats,
      recent: entries.slice(0, 30).map((e) => ({
        id: e.id,
        date: e.date.toISOString().slice(0, 10),
        kind: e.kind,
        flow: e.flow,
        symptoms: e.symptoms ? (JSON.parse(e.symptoms) as string[]) : [],
        note: e.note,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/cycle — log a period start/end or a symptom entry. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const data = logCycleSchema.parse(body);

    const date = data.date ?? todayUtc();
    await db.cycleEntry.create({
      data: {
        userId: session.user.id,
        date,
        kind: data.kind,
        flow: data.flow,
        symptoms: data.symptoms ? JSON.stringify(data.symptoms) : null,
        note: data.note,
      },
    });

    return successResponse({ ok: true }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/cycle?id=... — remove a logged entry. */
export async function DELETE(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse("Missing id", 400);

    await db.cycleEntry.deleteMany({ where: { id, userId: session.user.id } });
    return successResponse({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
