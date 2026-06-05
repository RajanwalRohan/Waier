import { describe, it, expect } from "vitest";
import { scoreMatchup, pairRound, currentPeriod, generateJoinCode, type CategoryInput } from "@/lib/championship";

describe("scoreMatchup", () => {
  it("awards a category to the higher value", () => {
    const cats: CategoryInput[] = [
      { key: "steps", label: "Steps", valueA: 12000, valueB: 8000 },
      { key: "workouts", label: "Workouts", valueA: 2, valueB: 4 },
    ];
    const r = scoreMatchup(cats);
    expect(r.categories[0].winner).toBe("a");
    expect(r.categories[1].winner).toBe("b");
    expect(r.aPoints).toBe(1);
    expect(r.bPoints).toBe(1);
    expect(r.winner).toBe("tie");
  });

  it("produces a 7-3 style result and names the winner", () => {
    const cats: CategoryInput[] = Array.from({ length: 10 }, (_, i) => ({
      key: `c${i}`,
      label: `c${i}`,
      valueA: i < 7 ? 10 : 1,
      valueB: i < 7 ? 1 : 10,
    }));
    const r = scoreMatchup(cats);
    expect(r.aPoints).toBe(7);
    expect(r.bPoints).toBe(3);
    expect(r.winner).toBe("a");
  });

  it("splits ties", () => {
    const r = scoreMatchup([{ key: "x", label: "x", valueA: 5, valueB: 5 }]);
    expect(r.aPoints).toBe(0.5);
    expect(r.bPoints).toBe(0.5);
    expect(r.categories[0].winner).toBe("tie");
  });

  it("honors lowerWins (e.g. resting HR)", () => {
    const r = scoreMatchup([{ key: "rhr", label: "RHR", valueA: 55, valueB: 62, lowerWins: true }]);
    expect(r.categories[0].winner).toBe("a");
  });
});

describe("pairRound", () => {
  it("pairs everyone exactly once per round (even count)", () => {
    const members = ["a", "b", "c", "d"];
    const pairs = pairRound(members, 0);
    const seen = pairs.flatMap((p) => [p[0], p[1]]).filter(Boolean);
    expect(new Set(seen).size).toBe(4);
    expect(pairs).toHaveLength(2);
  });

  it("produces different pairings across rounds", () => {
    const members = ["a", "b", "c", "d"];
    const r0 = JSON.stringify(pairRound(members, 0));
    const r1 = JSON.stringify(pairRound(members, 1));
    expect(r0).not.toBe(r1);
  });

  it("over a full rotation, everyone faces everyone (n=4 -> 3 rounds)", () => {
    const members = ["a", "b", "c", "d"];
    const faced = new Set<string>();
    for (let round = 0; round < 3; round++) {
      for (const [x, y] of pairRound(members, round)) {
        if (x && y) faced.add([x, y].sort().join("-"));
      }
    }
    // C(4,2) = 6 unique matchups
    expect(faced.size).toBe(6);
  });

  it("gives a bye with an odd number of members", () => {
    const pairs = pairRound(["a", "b", "c"], 0);
    const byes = pairs.filter((p) => p[1] === null);
    expect(byes).toHaveLength(1);
  });

  it("returns nothing for fewer than two members", () => {
    expect(pairRound(["a"], 0)).toEqual([]);
  });
});

describe("currentPeriod", () => {
  it("is 0 before a full period elapses and increments each period", () => {
    const start = new Date("2026-06-01T00:00:00Z");
    expect(currentPeriod(start, new Date("2026-06-05T00:00:00Z"), 14)).toBe(0);
    expect(currentPeriod(start, new Date("2026-06-16T00:00:00Z"), 14)).toBe(1);
    expect(currentPeriod(start, new Date("2026-06-30T00:00:00Z"), 14)).toBe(2);
  });
});

describe("generateJoinCode", () => {
  it("is 6 characters from the safe alphabet", () => {
    const code = generateJoinCode(() => 0.5);
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/);
  });
});
