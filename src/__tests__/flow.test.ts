import { describe, it, expect } from "vitest";
import {
  computeRawFlow,
  displayFlow,
  applyEma,
  streakScore,
  consistencyPillar,
  blendSubMetric,
  weightedPillar,
} from "@/lib/flow/scoring";
import { getRank, tierProgress } from "@/lib/flow/ranks";
import { PILLAR_WEIGHTS } from "@/lib/flow/constants";

// ─── PRD Worked Examples (Section 8.9) ────────────────────
// These are the canonical examples from the PRD. If the engine ever stops
// reproducing them, either the engine or the PRD has drifted.

describe("Flow — PRD worked examples", () => {
  it("Example A: committed beginner lands at 474 (Rapid III)", () => {
    const raw = computeRawFlow({ heart: 53, motion: 47, recovery: 45, fuel: 59, consistency: 36 });
    expect(displayFlow(raw)).toBe(474);
    expect(getRank(474).label).toBe("Rapid III");
  });

  it("Example B: elite all-rounder reaches 927 (Maelstrom)", () => {
    const raw = computeRawFlow({ heart: 93, motion: 92, recovery: 90, fuel: 93, consistency: 96 });
    expect(displayFlow(raw)).toBe(927);
    expect(getRank(displayFlow(raw)).tier).toBe("Maelstrom");
    expect(getRank(displayFlow(raw)).division).toBeNull();
  });

  it("Example C: strong body but ignores nutrition + consistency caps at 761 (Surge)", () => {
    // 761 falls in the Surge band (600-774); Tidal starts at 775. The point of
    // the example holds: a physical specimen who ignores nutrition and
    // consistency is capped well below the apex.
    const raw = computeRawFlow({ heart: 93, motion: 92, recovery: 90, fuel: 30, consistency: 60 });
    expect(displayFlow(raw)).toBe(761);
    expect(getRank(761).tier).toBe("Surge");
  });
});

// ─── Pillar weighting ─────────────────────────────────────

describe("computeRawFlow", () => {
  it("weights sum to 1.0", () => {
    const sum = Object.values(PILLAR_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("all-100 pillars yield a perfect 1000", () => {
    expect(computeRawFlow({ heart: 100, motion: 100, recovery: 100, fuel: 100, consistency: 100 })).toBe(1000);
  });

  it("all-zero pillars yield 0", () => {
    expect(computeRawFlow({ heart: 0, motion: 0, recovery: 0, fuel: 0, consistency: 0 })).toBe(0);
  });

  it("Motion (0.25) moves the needle more than Fuel (0.15)", () => {
    const base = { heart: 50, motion: 50, recovery: 50, fuel: 50, consistency: 50 };
    const motionBoost = computeRawFlow({ ...base, motion: 100 });
    const fuelBoost = computeRawFlow({ ...base, fuel: 100 });
    expect(motionBoost).toBeGreaterThan(fuelBoost);
  });
});

// ─── Sub-metric blend ─────────────────────────────────────

describe("blendSubMetric", () => {
  it("weights absolute 0.65 and percentile 0.35", () => {
    expect(blendSubMetric(90, 40)).toBeCloseTo(0.65 * 90 + 0.35 * 40, 6);
  });

  it("clamps inputs to 0-100", () => {
    expect(blendSubMetric(200, -50)).toBe(65); // 0.65*100 + 0.35*0
  });
});

// ─── Missing-data redistribution ──────────────────────────

describe("weightedPillar", () => {
  it("redistributes weight across present sub-metrics", () => {
    // VO2 max missing: remaining 0.40 + 0.35 renormalize to 0.533 / 0.467
    const result = weightedPillar([
      { value: 80, weight: 0.4 },
      { value: 60, weight: 0.35 },
      { value: null, weight: 0.25 },
    ]);
    const expected = (80 * 0.4 + 60 * 0.35) / (0.4 + 0.35);
    expect(result).toBeCloseTo(expected, 6);
  });

  it("returns null when every sub-metric is missing", () => {
    expect(weightedPillar([{ value: null, weight: 0.5 }, { value: null, weight: 0.5 }])).toBeNull();
  });
});

// ─── Streak curve (PRD 8.4) ───────────────────────────────

describe("streakScore", () => {
  it("is zero for a broken streak", () => {
    expect(streakScore(0)).toBe(0);
    expect(streakScore(-3)).toBe(0);
  });

  it("matches the PRD saturating curve at key points", () => {
    expect(streakScore(7)).toBeCloseTo(20.8, 1);
    expect(streakScore(30)).toBeCloseTo(63.2, 1);
    expect(streakScore(60)).toBeCloseTo(86.5, 1);
    expect(streakScore(90)).toBeCloseTo(95.0, 1);
  });

  it("is monotonic and never exceeds 100", () => {
    let prev = 0;
    for (let d = 1; d <= 400; d += 7) {
      const s = streakScore(d);
      expect(s).toBeGreaterThanOrEqual(prev);
      expect(s).toBeLessThan(100);
      prev = s;
    }
  });
});

// ─── Consistency pillar ───────────────────────────────────

describe("consistencyPillar", () => {
  it("combines orb rate (0.40) with meal + workout streaks (0.30 each)", () => {
    // 80% orb, 30-day meal streak, 30-day workout streak
    const expected = 0.4 * 80 + 0.3 * streakScore(30) + 0.3 * streakScore(30);
    expect(consistencyPillar(80, 30, 30)).toBeCloseTo(expected, 6);
  });
});

// ─── EMA smoothing ────────────────────────────────────────

describe("applyEma", () => {
  it("uses raw score on the first day", () => {
    expect(applyEma(500, null)).toBe(500);
  });

  it("blends 25% new / 75% prior", () => {
    expect(applyEma(600, 500)).toBe(525);
  });

  it("a single bad day barely moves a high score", () => {
    const moved = applyEma(200, 900);
    expect(moved).toBeGreaterThan(720); // 0.25*200 + 0.75*900 = 725
  });
});

// ─── Rank ladder ──────────────────────────────────────────

describe("getRank", () => {
  it("places boundary scores in the right tiers", () => {
    expect(getRank(0).tier).toBe("Still");
    expect(getRank(99).tier).toBe("Still");
    expect(getRank(100).tier).toBe("Ripple");
    expect(getRank(424).tier).toBe("Stream");
    expect(getRank(425).tier).toBe("Rapid");
    expect(getRank(925).tier).toBe("Maelstrom");
    expect(getRank(1000).tier).toBe("Maelstrom");
  });

  it("assigns divisions III (low) to I (high) within a tier", () => {
    // Rapid is 425-599
    expect(getRank(430).label).toBe("Rapid III");
    expect(getRank(510).label).toBe("Rapid II");
    expect(getRank(590).label).toBe("Rapid I");
  });

  it("gives Maelstrom no division", () => {
    expect(getRank(960).division).toBeNull();
    expect(getRank(960).label).toBe("Maelstrom");
  });

  it("clamps out-of-range scores", () => {
    expect(getRank(-50).tier).toBe("Still");
    expect(getRank(5000).tier).toBe("Maelstrom");
  });
});

describe("tierProgress", () => {
  it("is 0 at the tier floor and ~1 at the tier ceiling", () => {
    expect(tierProgress(425)).toBeCloseTo(0, 2); // Rapid floor
    expect(tierProgress(599)).toBeCloseTo(1, 1); // Rapid ceiling
  });
});
