import { describe, it, expect } from "vitest";
import {
  resolvePrivacy,
  applyPrivacy,
  rankByFlow,
  normalizeUsername,
  DEFAULT_PRIVACY,
  type ProfilePayload,
} from "@/lib/social";

describe("resolvePrivacy", () => {
  it("returns conservative defaults for null", () => {
    expect(resolvePrivacy(null)).toEqual(DEFAULT_PRIVACY);
  });
  it("fills missing keys with defaults", () => {
    expect(resolvePrivacy(JSON.stringify({ showStats: true }))).toEqual({ ...DEFAULT_PRIVACY, showStats: true });
  });
  it("falls back on invalid JSON", () => {
    expect(resolvePrivacy("not json")).toEqual(DEFAULT_PRIVACY);
  });
});

const payload: ProfilePayload = {
  flow: 612,
  tier: "Surge",
  streaks: { bubble: 5, meal: 12, workout: 3 },
  stats: { workouts: 40 },
  pillars: { heart: 70 },
};

describe("applyPrivacy", () => {
  it("shows everything to the owner regardless of settings", () => {
    const privacy = { showFlow: false, showStreaks: false, showStats: false, showPillars: false };
    expect(applyPrivacy(payload, privacy, true)).toEqual(payload);
  });

  it("hides fields per settings for others", () => {
    const privacy = { showFlow: true, showStreaks: true, showStats: false, showPillars: false };
    const out = applyPrivacy(payload, privacy, false);
    expect(out.flow).toBe(612);
    expect(out.streaks).not.toBeNull();
    expect(out.stats).toBeNull();
    expect(out.pillars).toBeNull();
  });

  it("hides Flow and tier together when showFlow is off", () => {
    const privacy = { showFlow: false, showStreaks: true, showStats: true, showPillars: true };
    const out = applyPrivacy(payload, privacy, false);
    expect(out.flow).toBeNull();
    expect(out.tier).toBeNull();
  });
});

describe("rankByFlow", () => {
  it("ranks by Flow descending", () => {
    const ranked = rankByFlow([
      { userId: "a", flow: 400 },
      { userId: "b", flow: 700 },
      { userId: "c", flow: 550 },
    ]);
    expect(ranked.map((r) => r.item.userId)).toEqual(["b", "c", "a"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("shares a rank on ties and skips the next (standard competition ranking)", () => {
    const ranked = rankByFlow([
      { userId: "a", flow: 700 },
      { userId: "b", flow: 700 },
      { userId: "c", flow: 500 },
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("sorts users without a Flow last", () => {
    const ranked = rankByFlow([
      { userId: "a", flow: null },
      { userId: "b", flow: 300 },
    ]);
    expect(ranked[0].item.userId).toBe("b");
  });
});

describe("normalizeUsername", () => {
  it("lowercases and strips invalid characters", () => {
    expect(normalizeUsername("Rohan_R")).toBe("rohan_r");
    expect(normalizeUsername("a b.c!")).toBe("abc");
  });
  it("rejects too-short or too-long handles", () => {
    expect(normalizeUsername("ab")).toBeNull();
    expect(normalizeUsername("x".repeat(21))).toBeNull();
  });
});
