import { describe, it, expect } from "vitest";
import { generateTrainingPlan, generateNutritionPlan, countSessions } from "@/lib/plans";

describe("generateTrainingPlan", () => {
  it("produces one item per calendar day", () => {
    const items = generateTrainingPlan({ weeks: 4, daysPerWeek: 3, startWeekday: 1 });
    expect(items).toHaveLength(28);
    expect(items[0].dayOffset).toBe(0);
    expect(items[27].dayOffset).toBe(27);
  });

  it("schedules daysPerWeek sessions per week", () => {
    const items = generateTrainingPlan({ weeks: 4, daysPerWeek: 3, startWeekday: 1 });
    expect(countSessions(items)).toBe(12); // 3/wk * 4 weeks
  });

  it("rotates the split focus across sessions", () => {
    const items = generateTrainingPlan({ weeks: 1, daysPerWeek: 3, startWeekday: 1 });
    const focuses = items.filter((i) => i.kind === "workout").map((i) => i.payload?.focus);
    expect(focuses).toEqual(["Push", "Pull", "Legs"]);
  });

  it("marks non-training days as rest", () => {
    const items = generateTrainingPlan({ weeks: 1, daysPerWeek: 3, startWeekday: 1 });
    expect(items.filter((i) => i.kind === "rest")).toHaveLength(4);
  });

  it("clamps out-of-range days per week", () => {
    const items = generateTrainingPlan({ weeks: 1, daysPerWeek: 99, startWeekday: 0 });
    expect(countSessions(items)).toBe(7); // clamped to 7
  });
});

describe("generateNutritionPlan", () => {
  it("creates a daily target item per day", () => {
    const items = generateNutritionPlan({ weeks: 2, calorieGoal: 2400, proteinGoalG: 180 });
    expect(items).toHaveLength(14);
    expect(items[0].kind).toBe("habit");
    expect(items[0].title).toContain("2400");
    expect(items[0].title).toContain("180");
  });

  it("falls back to a generic title without goals", () => {
    const items = generateNutritionPlan({ weeks: 1, calorieGoal: null, proteinGoalG: null });
    expect(items[0].title).toMatch(/log meals/i);
  });
});
