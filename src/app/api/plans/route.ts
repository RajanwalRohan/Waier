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
import { createPlanSchema } from "@/lib/validations/plans";
import { generateTrainingPlan, generateNutritionPlan } from "@/lib/plans";

function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** GET /api/plans — active plans with their items, progress, and today's items. */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const plans = await db.plan.findMany({
      where: { userId: session.user.id, status: { in: ["active", "paused"] } },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { date: "asc" } } },
    });

    const todayKey = todayUtc().toISOString().slice(0, 10);

    return successResponse({
      plans: plans.map((p) => {
        const total = p.items.length;
        const done = p.items.filter((i) => i.completed).length;
        return {
          id: p.id,
          name: p.name,
          kind: p.kind,
          status: p.status,
          startDate: p.startDate.toISOString().slice(0, 10),
          endDate: p.endDate.toISOString().slice(0, 10),
          progress: total ? Math.round((done / total) * 100) : 0,
          done,
          total,
          today: p.items
            .filter((i) => i.date.toISOString().slice(0, 10) === todayKey)
            .map((i) => ({ id: i.id, kind: i.kind, title: i.title, completed: i.completed })),
          upcoming: p.items
            .filter((i) => i.date.toISOString().slice(0, 10) > todayKey && i.kind !== "rest")
            .slice(0, 5)
            .map((i) => ({ id: i.id, date: i.date.toISOString().slice(0, 10), kind: i.kind, title: i.title })),
        };
      }),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/plans — generate and persist a plan from the user's profile. */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);
    const data = createPlanSchema.parse(body);

    const profile = await db.profile.findUnique({ where: { userId: session.user.id } });

    const start = todayUtc();
    const specs =
      data.kind === "training"
        ? generateTrainingPlan({
            weeks: data.weeks,
            daysPerWeek: profile?.exerciseDaysPerWeek ?? 3,
            startWeekday: start.getUTCDay(),
          })
        : generateNutritionPlan({
            weeks: data.weeks,
            calorieGoal: profile?.calorieGoal ?? null,
            proteinGoalG: profile?.proteinGoalG ?? null,
          });

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + data.weeks * 7 - 1);

    const name = data.name ?? `${data.weeks}-Week ${data.kind === "training" ? "Training" : "Nutrition"} Plan`;

    const plan = await db.plan.create({
      data: {
        userId: session.user.id,
        goalId: data.goalId,
        name,
        kind: data.kind,
        startDate: start,
        endDate: end,
        items: {
          create: specs.map((s, i) => {
            const date = new Date(start);
            date.setUTCDate(date.getUTCDate() + s.dayOffset);
            return {
              date,
              kind: s.kind,
              title: s.title,
              payload: s.payload ? JSON.stringify(s.payload) : null,
              order: i,
            };
          }),
        },
      },
    });

    return successResponse({ id: plan.id }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
