import { describe, it, expect } from "vitest";
import { evaluateLab, labStatusLabel, labTrend } from "@/lib/labs";

describe("evaluateLab", () => {
  it("classifies within a two-sided range", () => {
    expect(evaluateLab(5.4, 4.0, 5.6)).toBe("in_range");
    expect(evaluateLab(3.2, 4.0, 5.6)).toBe("low");
    expect(evaluateLab(6.1, 4.0, 5.6)).toBe("high");
  });

  it("handles one-sided ranges", () => {
    expect(evaluateLab(210, null, 200)).toBe("high"); // LDL upper bound only
    expect(evaluateLab(150, null, 200)).toBe("in_range");
    expect(evaluateLab(30, 40, null)).toBe("low"); // HDL lower bound only
    expect(evaluateLab(55, 40, null)).toBe("in_range");
  });

  it("is unknown without any reference", () => {
    expect(evaluateLab(100, null, null)).toBe("unknown");
  });

  it("treats the bounds as inclusive", () => {
    expect(evaluateLab(4.0, 4.0, 5.6)).toBe("in_range");
    expect(evaluateLab(5.6, 4.0, 5.6)).toBe("in_range");
  });
});

describe("labStatusLabel", () => {
  it("maps statuses to copy", () => {
    expect(labStatusLabel("high")).toBe("Above range");
    expect(labStatusLabel("in_range")).toBe("In range");
  });
});

describe("labTrend", () => {
  it("needs at least two points", () => {
    expect(labTrend([])).toBe("none");
    expect(labTrend([5])).toBe("none");
  });
  it("detects up, down, and flat with a deadband", () => {
    expect(labTrend([5.0, 5.8])).toBe("up");
    expect(labTrend([5.8, 5.0])).toBe("down");
    expect(labTrend([5.0, 5.05])).toBe("flat"); // within 2%
  });
});
