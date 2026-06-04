import { describe, it, expect } from "vitest";
import { goalProgress, isGoalComplete, goalView, daysUntil } from "@/lib/goals";

describe("goalProgress", () => {
  it("tracks a weight-loss goal (target below start)", () => {
    // 80kg -> 70kg, currently 75kg = halfway
    expect(goalProgress(80, 75, 70)).toBeCloseTo(0.5, 6);
  });

  it("tracks a strength goal (target above start)", () => {
    // 100lb -> 150lb, currently 125lb = halfway
    expect(goalProgress(100, 125, 150)).toBeCloseTo(0.5, 6);
  });

  it("clamps to [0,1]", () => {
    expect(goalProgress(80, 85, 70)).toBe(0); // moved the wrong way
    expect(goalProgress(80, 65, 70)).toBe(1); // overshot the target
  });

  it("handles start == target", () => {
    expect(goalProgress(70, 70, 70)).toBe(1);
    expect(goalProgress(70, 72, 70)).toBe(0);
  });
});

describe("isGoalComplete", () => {
  it("completes a decreasing goal when at or below target", () => {
    expect(isGoalComplete(80, 70, 70)).toBe(true);
    expect(isGoalComplete(80, 69, 70)).toBe(true);
    expect(isGoalComplete(80, 71, 70)).toBe(false);
  });

  it("completes an increasing goal when at or above target", () => {
    expect(isGoalComplete(100, 150, 150)).toBe(true);
    expect(isGoalComplete(100, 151, 150)).toBe(true);
    expect(isGoalComplete(100, 149, 150)).toBe(false);
  });
});

describe("goalView", () => {
  it("reports remaining distance to target", () => {
    const v = goalView(80, 75, 70);
    expect(v.progress).toBeCloseTo(0.5, 6);
    expect(v.complete).toBe(false);
    expect(v.remaining).toBe(5);
  });

  it("zeroes remaining once complete", () => {
    const v = goalView(80, 68, 70);
    expect(v.complete).toBe(true);
    expect(v.remaining).toBe(0);
  });
});

describe("daysUntil", () => {
  it("returns null with no deadline", () => {
    expect(daysUntil(null)).toBeNull();
  });
  it("counts whole days to a future date", () => {
    const future = new Date();
    future.setUTCHours(0, 0, 0, 0);
    future.setUTCDate(future.getUTCDate() + 10);
    expect(daysUntil(future)).toBe(10);
  });
});
