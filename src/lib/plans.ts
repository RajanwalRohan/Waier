/**
 * Coaching plan generator (pure).
 *
 * Produces a day-by-day list of plan-item specs from simple inputs. v1 is
 * template-based and calibrated to the user's profile (training days per week,
 * calorie/protein goals). AI-authored, adaptive plans are a later enhancement
 * that can replace this generator behind the same item shape.
 *
 * Pure: no dates, no I/O. The caller assigns calendar dates from dayOffset.
 */

export type PlanItemKind = "workout" | "meal" | "habit" | "rest";

export interface PlanItemSpec {
  dayOffset: number; // 0-based day from plan start
  kind: PlanItemKind;
  title: string;
  payload?: Record<string, unknown>;
}

/** Which weekdays (0=Sun..6=Sat) are training days for a given days-per-week. */
const TRAINING_WEEKDAYS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

/** Rotating workout focus per days-per-week. */
const SPLITS: Record<number, string[]> = {
  1: ["Full Body"],
  2: ["Upper Body", "Lower Body"],
  3: ["Push", "Pull", "Legs"],
  4: ["Upper", "Lower", "Push", "Pull"],
  5: ["Push", "Pull", "Legs", "Upper", "Lower"],
  6: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"],
  7: ["Push", "Pull", "Legs", "Upper", "Lower", "Cardio", "Mobility"],
};

function clampDays(d: number): number {
  return Math.max(1, Math.min(7, Math.round(d)));
}

export interface TrainingPlanParams {
  weeks: number;
  daysPerWeek: number;
  /** Weekday (0=Sun..6=Sat) the plan starts on, so training days land sensibly. */
  startWeekday: number;
}

/**
 * Generate a training plan: workout days follow the split rotation, other days
 * are rest. One item per calendar day across the plan span.
 */
export function generateTrainingPlan(params: TrainingPlanParams): PlanItemSpec[] {
  const days = clampDays(params.daysPerWeek);
  const weeks = Math.max(1, Math.min(52, Math.round(params.weeks)));
  const trainingDays = TRAINING_WEEKDAYS[days];
  const split = SPLITS[days];
  const items: PlanItemSpec[] = [];
  let workoutIndex = 0;

  for (let offset = 0; offset < weeks * 7; offset++) {
    const weekday = (params.startWeekday + offset) % 7;
    if (trainingDays.includes(weekday)) {
      const focus = split[workoutIndex % split.length];
      items.push({ dayOffset: offset, kind: "workout", title: `${focus} workout`, payload: { focus } });
      workoutIndex++;
    } else {
      items.push({ dayOffset: offset, kind: "rest", title: "Rest / recovery" });
    }
  }
  return items;
}

export interface NutritionPlanParams {
  weeks: number;
  calorieGoal: number | null;
  proteinGoalG: number | null;
}

/** Generate a nutrition plan: one daily target item per day. */
export function generateNutritionPlan(params: NutritionPlanParams): PlanItemSpec[] {
  const weeks = Math.max(1, Math.min(52, Math.round(params.weeks)));
  const cal = params.calorieGoal;
  const protein = params.proteinGoalG;
  const title = cal
    ? `Hit ${cal} kcal${protein ? ` / ${protein}g protein` : ""}`
    : "Log meals and hit your targets";
  const items: PlanItemSpec[] = [];
  for (let offset = 0; offset < weeks * 7; offset++) {
    items.push({ dayOffset: offset, kind: "habit", title, payload: { calorieGoal: cal, proteinGoalG: protein } });
  }
  return items;
}

/** Count workout (non-rest) sessions in a generated set of specs. */
export function countSessions(items: PlanItemSpec[]): number {
  return items.filter((i) => i.kind === "workout").length;
}
