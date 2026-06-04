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
import { moodCheckInSchema } from "@/lib/validations/wellbeing";

function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/wellbeing
 * Recent mood check-ins, today's check-in (if any), and the wearable-derived
 * stress trend for the Mental Wellbeing surface.
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const [checkIns, stress, today] = await Promise.all([
      db.moodCheckIn.findMany({
        where: { userId: session.user.id, date: { gte: thirtyDaysAgo } },
        orderBy: { date: "asc" },
      }),
      db.healthMetric.findMany({
        where: { userId: session.user.id, type: "stress_level", date: { gte: thirtyDaysAgo } },
        orderBy: { date: "asc" },
        select: { value: true, date: true },
      }),
      db.moodCheckIn.findUnique({ where: { userId_date: { userId: session.user.id, date: todayUtc() } } }),
    ]);

    return successResponse({
      today: today ? { mood: today.mood, energy: today.energy, focus: today.focus, note: today.note } : null,
      checkIns: checkIns.map((c) => ({
        date: c.date.toISOString().slice(0, 10),
        mood: c.mood,
        energy: c.energy,
        focus: c.focus,
        note: c.note,
      })),
      stress: stress.map((s) => ({ date: s.date.toISOString().slice(0, 10), value: Math.round(s.value) })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/wellbeing
 * Upsert today's mood / energy / focus check-in.
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = moodCheckInSchema.parse(body);
    const date = todayUtc();

    const checkIn = await db.moodCheckIn.upsert({
      where: { userId_date: { userId: session.user.id, date } },
      create: { userId: session.user.id, date, ...data },
      update: { ...data },
    });

    return successResponse({ checkIn: { mood: checkIn.mood, energy: checkIn.energy, focus: checkIn.focus, note: checkIn.note } }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
