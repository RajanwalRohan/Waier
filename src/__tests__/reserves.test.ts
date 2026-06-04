import { describe, it, expect } from "vitest";
import {
  computeReserves,
  blendReserves,
  sleepReadiness,
  loadReadiness,
  reservesLabel,
  RESERVES_WEIGHTS,
} from "@/lib/reserves";

describe("sleepReadiness", () => {
  it("is 100 at or above goal", () => {
    expect(sleepReadiness(8, 8)).toBe(100);
    expect(sleepReadiness(9, 8)).toBe(100);
  });
  it("scales linearly below goal", () => {
    expect(sleepReadiness(4, 8)).toBe(50);
    expect(sleepReadiness(6, 8)).toBe(75);
  });
});

describe("loadReadiness", () => {
  it("is full with no recent sessions and drops with load", () => {
    expect(loadReadiness(0)).toBe(100);
    expect(loadReadiness(1)).toBe(60);
    expect(loadReadiness(2)).toBe(20);
    expect(loadReadiness(3)).toBe(0);
    expect(loadReadiness(5)).toBe(0); // clamped
  });
});

describe("blendReserves", () => {
  it("weights components per the spec", () => {
    const score = blendReserves({ sleep: 100, hrv: 100, restingHr: 100, load: 100 });
    expect(score).toBe(100);
  });

  it("renormalizes weight when components are missing", () => {
    // Only sleep and hrv present: weights 0.35 and 0.30 renormalize.
    const score = blendReserves({ sleep: 80, hrv: 60, restingHr: null, load: null });
    const expected = (80 * RESERVES_WEIGHTS.sleep + 60 * RESERVES_WEIGHTS.hrv) / (RESERVES_WEIGHTS.sleep + RESERVES_WEIGHTS.hrv);
    expect(score).toBeCloseTo(expected, 6);
  });

  it("returns 0 when everything is missing", () => {
    expect(blendReserves({ sleep: null, hrv: null, restingHr: null, load: null })).toBe(0);
  });
});

describe("computeReserves", () => {
  it("well-recovered athlete scores high", () => {
    const { score } = computeReserves({
      sleepHours: 8, sleepGoalHours: 8, hrvScore: 90, restingHrScore: 90, recentSessions: 0, hasTrainingData: true,
    });
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it("poorly-recovered (bad sleep, low HRV, hard training) scores low", () => {
    const { score } = computeReserves({
      sleepHours: 4, sleepGoalHours: 8, hrvScore: 25, restingHrScore: 25, recentSessions: 3, hasTrainingData: true,
    });
    expect(score).toBeLessThan(40);
  });

  it("omits the load component when there is no training data", () => {
    const { components } = computeReserves({
      sleepHours: 7, hrvScore: 70, restingHrScore: 70, recentSessions: 0, hasTrainingData: false,
    });
    expect(components.load).toBeNull();
  });
});

describe("reservesLabel", () => {
  it("maps score bands to labels", () => {
    expect(reservesLabel(80)).toBe("Primed");
    expect(reservesLabel(60)).toBe("Ready");
    expect(reservesLabel(40)).toBe("Moderate");
    expect(reservesLabel(20)).toBe("Run down");
  });
});
