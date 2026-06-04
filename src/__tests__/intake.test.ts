import { describe, it, expect } from "vitest";
import {
  sumHydrationMl,
  hydrationProgress,
  formatMl,
  countModifiersByKind,
  sumModifierAmount,
} from "@/lib/intake";

describe("sumHydrationMl", () => {
  it("sums amounts", () => {
    expect(sumHydrationMl([{ amountMl: 250 }, { amountMl: 500 }, { amountMl: 250 }])).toBe(1000);
  });
  it("is zero for no logs", () => {
    expect(sumHydrationMl([])).toBe(0);
  });
});

describe("hydrationProgress", () => {
  it("computes percent of goal", () => {
    expect(hydrationProgress(1250, 2500)).toBe(50);
  });
  it("clamps at 100 over goal", () => {
    expect(hydrationProgress(3000, 2500)).toBe(100);
  });
  it("is 0 for a non-positive goal", () => {
    expect(hydrationProgress(500, 0)).toBe(0);
  });
});

describe("formatMl", () => {
  it("shows mL under a litre and L at/above", () => {
    expect(formatMl(250)).toBe("250 mL");
    expect(formatMl(1500)).toBe("1.5 L");
    expect(formatMl(2000)).toBe("2 L");
  });
});

describe("countModifiersByKind", () => {
  it("tallies by kind", () => {
    const mods = [{ kind: "caffeine" }, { kind: "caffeine" }, { kind: "alcohol" }];
    expect(countModifiersByKind(mods)).toEqual({ caffeine: 2, alcohol: 1 });
  });
});

describe("sumModifierAmount", () => {
  it("sums amounts for one kind, ignoring nulls and other kinds", () => {
    const mods = [
      { kind: "caffeine", amount: 95 },
      { kind: "caffeine", amount: 80 },
      { kind: "caffeine", amount: null },
      { kind: "alcohol", amount: 1 },
    ];
    expect(sumModifierAmount(mods, "caffeine")).toBe(175);
  });
});
