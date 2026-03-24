import { describe, it, expect } from "vitest";
import { buildSystemMessage, type UserCoachingContext } from "@/lib/ai";

describe("buildSystemMessage", () => {
  it("returns base system prompt when no context", () => {
    const msg = buildSystemMessage(null);
    expect(msg).toContain("health and fitness coach");
    expect(msg).not.toContain("User context");
  });

  it("includes age group (bucketed to 5-year groups)", () => {
    const ctx: UserCoachingContext = { age: 27 };
    const msg = buildSystemMessage(ctx);
    expect(msg).toContain("Age group: 25s"); // 27 → floor(27/5)*5 = 25
  });

  it("rounds height to nearest cm", () => {
    const ctx: UserCoachingContext = { heightCm: 175.6 };
    const msg = buildSystemMessage(ctx);
    expect(msg).toContain("Height: ~176cm");
  });

  it("rounds weight to nearest kg", () => {
    const ctx: UserCoachingContext = { weightKg: 82.3 };
    const msg = buildSystemMessage(ctx);
    expect(msg).toContain("Weight: ~82kg");
  });

  it("includes fitness goal with underscores replaced", () => {
    const ctx: UserCoachingContext = { fitnessGoal: "gain_muscle" };
    const msg = buildSystemMessage(ctx);
    expect(msg).toContain("Goal: gain muscle");
  });

  it("includes dietary preferences as comma-separated list", () => {
    const ctx: UserCoachingContext = {
      dietaryPreferences: ["vegan", "gluten_free"],
    };
    const msg = buildSystemMessage(ctx);
    expect(msg).toContain("Dietary preferences: vegan, gluten_free");
  });

  it("omits null/undefined fields", () => {
    const ctx: UserCoachingContext = {
      age: null,
      heightCm: undefined,
      sex: "female",
    };
    const msg = buildSystemMessage(ctx);
    expect(msg).not.toContain("Age");
    expect(msg).not.toContain("Height");
    expect(msg).toContain("Sex: female");
  });

  it("includes BOUNDARIES section in all system prompts", () => {
    const msg = buildSystemMessage({ age: 30 });
    expect(msg).toContain("BOUNDARIES");
    expect(msg).toContain("Never diagnose medical conditions");
  });

  it("handles empty dietary preferences array", () => {
    const ctx: UserCoachingContext = { dietaryPreferences: [] };
    const msg = buildSystemMessage(ctx);
    expect(msg).not.toContain("Dietary preferences");
  });
});
