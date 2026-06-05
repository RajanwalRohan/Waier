import { describe, it, expect } from "vitest";
import { buildWrapped, type WrappedInput } from "@/lib/wrapped";

const base: WrappedInput = {
  year: 2026,
  flowSeries: [
    { date: "2026-01-01", flow: 300 },
    { date: "2026-06-01", flow: 620 },
    { date: "2026-12-01", flow: 580 },
  ],
  totalWorkouts: 180,
  totalMeals: 900,
  totalDistanceKm: 412.7,
  totalActiveCalories: 240000,
  longestStreak: 64,
  pillarAverages: { heart: 70, motion: 82, recovery: 60, fuel: 55, consistency: 78 },
};

describe("buildWrapped", () => {
  it("computes Flow peak, start, latest, and gain", () => {
    const w = buildWrapped(base);
    expect(w.flowPeak).toBe(620);
    expect(w.flowStart).toBe(300);
    expect(w.flowLatest).toBe(580);
    expect(w.flowGain).toBe(280);
  });

  it("maps the peak Flow to a rank label", () => {
    expect(buildWrapped(base).peakRank).toBe("Surge III"); // 620 is in the bottom third of Surge (600-774)
  });

  it("identifies the strongest pillar", () => {
    const w = buildWrapped(base);
    expect(w.strongestPillar).toBe("Motion");
    expect(w.strongestPillarScore).toBe(82);
  });

  it("passes through totals and rounds distance/calories", () => {
    const w = buildWrapped(base);
    expect(w.totalWorkouts).toBe(180);
    expect(w.totalDistanceKm).toBe(412.7);
    expect(w.longestStreak).toBe(64);
  });

  it("handles an empty year gracefully", () => {
    const w = buildWrapped({
      year: 2026,
      flowSeries: [],
      totalWorkouts: 0,
      totalMeals: 0,
      totalDistanceKm: 0,
      totalActiveCalories: 0,
      longestStreak: 0,
      pillarAverages: { heart: null, motion: null, recovery: null, fuel: null, consistency: null },
    });
    expect(w.hasData).toBe(false);
    expect(w.flowPeak).toBeNull();
    expect(w.strongestPillar).toBeNull();
  });
});
