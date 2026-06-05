import { describe, it, expect } from "vitest";
import { activityPoints, computeLP, rankZone, isoWeekKey, weekRange } from "@/lib/open-leagues";

describe("activityPoints", () => {
  it("weights steps, active calories, and workouts", () => {
    // 10000 steps (10) + 500 cal (5) + 3 workouts (150) = 165
    expect(activityPoints(10000, 500, 3)).toBe(165);
  });
});

describe("computeLP", () => {
  it("adds rewarded improvement to base points", () => {
    expect(computeLP(100, 40)).toBe(160); // 100 + 1.5*40
  });
  it("ignores negative improvement (no penalty)", () => {
    expect(computeLP(100, -20)).toBe(100);
  });
  it("lets a fast-improving beginner out-earn a flat veteran", () => {
    const beginner = computeLP(60, 60); // improving hard
    const veteran = computeLP(120, 0); // high output, no improvement
    expect(beginner).toBeGreaterThan(veteran); // 150 > 120
  });
});

describe("rankZone", () => {
  it("splits a cohort into promote / hold / demote thirds", () => {
    // cohort of 9: promote top 3, demote bottom 3
    expect(rankZone(1, 9)).toBe("promote");
    expect(rankZone(3, 9)).toBe("promote");
    expect(rankZone(5, 9)).toBe("hold");
    expect(rankZone(7, 9)).toBe("demote");
    expect(rankZone(9, 9)).toBe("demote");
  });
  it("holds everyone in a tiny cohort", () => {
    expect(rankZone(1, 2)).toBe("hold");
  });
});

describe("isoWeekKey", () => {
  it("computes the ISO week", () => {
    expect(isoWeekKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-W01");
    expect(isoWeekKey(new Date("2026-06-04T00:00:00Z"))).toBe("2026-W23");
  });
  it("is stable across a week", () => {
    const mon = isoWeekKey(new Date("2026-06-01T00:00:00Z"));
    const sun = isoWeekKey(new Date("2026-06-07T00:00:00Z"));
    expect(mon).toBe(sun);
  });
});

describe("weekRange", () => {
  it("returns Monday to next Monday", () => {
    const { start, end } = weekRange(new Date("2026-06-04T12:00:00Z")); // a Thursday
    expect(start.toISOString().slice(0, 10)).toBe("2026-06-01"); // Monday
    expect(end.toISOString().slice(0, 10)).toBe("2026-06-08"); // next Monday
  });
});
