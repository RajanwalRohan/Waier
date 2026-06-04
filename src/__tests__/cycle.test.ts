import { describe, it, expect } from "vitest";
import {
  averageCycleLength,
  predictNextPeriod,
  cyclePhase,
  cycleStats,
  phaseLabel,
  DEFAULT_CYCLE_LENGTH,
} from "@/lib/cycle";

const d = (s: string) => new Date(s + "T00:00:00.000Z");

describe("averageCycleLength", () => {
  it("averages gaps between consecutive starts", () => {
    expect(averageCycleLength([d("2026-01-01"), d("2026-01-29"), d("2026-02-26")])).toBe(28);
  });
  it("handles irregular cycles", () => {
    // gaps of 28 and 30 -> 29
    expect(averageCycleLength([d("2026-01-01"), d("2026-01-29"), d("2026-02-28")])).toBe(29);
  });
  it("returns null with fewer than two starts", () => {
    expect(averageCycleLength([d("2026-01-01")])).toBeNull();
    expect(averageCycleLength([])).toBeNull();
  });
  it("sorts unsorted input", () => {
    expect(averageCycleLength([d("2026-02-26"), d("2026-01-01"), d("2026-01-29")])).toBe(28);
  });
});

describe("predictNextPeriod", () => {
  it("adds the cycle length to the most recent start", () => {
    expect(predictNextPeriod([d("2026-02-26")], 28)?.toISOString().slice(0, 10)).toBe("2026-03-26");
  });
  it("returns null with no history", () => {
    expect(predictNextPeriod([], 28)).toBeNull();
  });
});

describe("cyclePhase (28-day cycle)", () => {
  const start = d("2026-06-01");
  it("is menstrual during the period", () => {
    expect(cyclePhase(start, d("2026-06-03"), 28).phase).toBe("menstrual");
  });
  it("is follicular after the period, before ovulation", () => {
    expect(cyclePhase(start, d("2026-06-10"), 28).phase).toBe("follicular");
  });
  it("is ovulatory around day 14", () => {
    expect(cyclePhase(start, d("2026-06-15"), 28).phase).toBe("ovulatory");
  });
  it("is luteal after ovulation", () => {
    expect(cyclePhase(start, d("2026-06-22"), 28).phase).toBe("luteal");
  });
  it("reports a 1-based cycle day", () => {
    expect(cyclePhase(start, d("2026-06-01"), 28).day).toBe(1);
    expect(cyclePhase(start, d("2026-06-10"), 28).day).toBe(10);
  });
});

describe("cycleStats", () => {
  it("summarizes a regular history", () => {
    const stats = cycleStats([d("2026-04-09"), d("2026-05-07"), d("2026-06-04")], d("2026-06-10"));
    expect(stats.cycleLength).toBe(28);
    expect(stats.estimated).toBe(false);
    expect(stats.lastStart).toBe("2026-06-04");
    expect(stats.nextPredicted).toBe("2026-07-02");
    expect(stats.phase).toBe("follicular"); // day 7
  });

  it("flags estimated when history is thin and uses the default length", () => {
    const stats = cycleStats([d("2026-06-01")], d("2026-06-03"));
    expect(stats.estimated).toBe(true);
    expect(stats.cycleLength).toBe(DEFAULT_CYCLE_LENGTH);
    expect(stats.phase).toBe("menstrual");
  });

  it("is empty with no history", () => {
    const stats = cycleStats([], d("2026-06-10"));
    expect(stats.lastStart).toBeNull();
    expect(stats.phase).toBeNull();
  });
});

describe("phaseLabel", () => {
  it("maps phases to labels", () => {
    expect(phaseLabel("ovulatory")).toBe("Ovulatory");
  });
});
