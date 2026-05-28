import { describe, it, expect } from "vitest";
import { signupSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { passwordSchema } from "@/lib/validations/common";
import { updateProfileSchema } from "@/lib/validations/profile";
import { createWorkoutSchema } from "@/lib/validations/workout";
import { connectWearableSchema, wearableCallbackSchema } from "@/lib/validations/wearable";
import { aiChatSchema } from "@/lib/validations/ai-chat";

// ─── Password Strength Rules ──────────────────────────────

describe("passwordSchema", () => {
  it("accepts a strong password", () => {
    expect(passwordSchema.safeParse("MyStr0ng!Pa55").success).toBe(true);
  });

  it("rejects password shorter than 12 chars", () => {
    expect(passwordSchema.safeParse("Short1!aB").success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    expect(passwordSchema.safeParse("alllowercase12!").success).toBe(false);
  });

  it("rejects password without lowercase", () => {
    expect(passwordSchema.safeParse("ALLUPPERCASE12!").success).toBe(false);
  });

  it("rejects password with only 1 number", () => {
    expect(passwordSchema.safeParse("NoNumbers1Here!").success).toBe(false);
  });

  it("rejects password without special character", () => {
    expect(passwordSchema.safeParse("NoSpecialChar12").success).toBe(false);
  });

  it("accepts password at exactly 12 chars meeting all rules", () => {
    expect(passwordSchema.safeParse("Abcdefgh12!@").success).toBe(true);
  });
});

// ─── Forgot / Reset Password Schemas ──────────────────────

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "user@test.com" }).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "not-email" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts valid token and strong password", () => {
    const result = resetPasswordSchema.safeParse({
      token: "abc123def456",
      password: "NewSecure12!@",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty token", () => {
    const result = resetPasswordSchema.safeParse({
      token: "",
      password: "NewSecure12!@",
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak password in reset", () => {
    const result = resetPasswordSchema.safeParse({
      token: "valid-token",
      password: "weak",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Auth Validation ──────────────────────────────────────

describe("signupSchema", () => {
  it("accepts valid signup data", () => {
    const result = signupSchema.safeParse({
      email: "Test@Example.com",
      password: "SecurePass12!",
      name: "Test User",
      dateOfBirth: "1995-06-15",
      sex: "male",
      heightCm: 175,
      weightKg: 75,
      activityLevel: "moderately_active",
      medicalConditions: ["Hypertension"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com"); // lowercased
    }
  });

  it("rejects short password", () => {
    const result = signupSchema.safeParse({
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({
      email: "not-an-email",
      password: "SecurePass12!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects overly long password (>128 chars)", () => {
    const result = signupSchema.safeParse({
      email: "test@example.com",
      password: "a".repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it("strips HTML from name", () => {
    const result = signupSchema.safeParse({
      email: "test@example.com",
      password: "SecurePass12!",
      name: "<script>alert('xss')</script>User",
      dateOfBirth: "1995-06-15",
      sex: "female",
      heightCm: 165,
      weightKg: 60,
      activityLevel: "lightly_active",
      medicalConditions: ["None"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).not.toContain("<script>");
    }
  });
});

// ─── Profile Validation ───────────────────────────────────

describe("updateProfileSchema", () => {
  it("accepts valid profile update", () => {
    const result = updateProfileSchema.safeParse({
      age: 30,
      heightCm: 175,
      weightKg: 70,
      sex: "male",
      fitnessGoal: "gain_muscle",
      activityLevel: "moderately_active",
      dietaryPreferences: ["vegan", "gluten_free"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects age below 13", () => {
    const result = updateProfileSchema.safeParse({ age: 10 });
    expect(result.success).toBe(false);
  });

  it("rejects age above 120", () => {
    const result = updateProfileSchema.safeParse({ age: 121 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid fitnessGoal", () => {
    const result = updateProfileSchema.safeParse({ fitnessGoal: "fly_to_moon" });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 dietary preferences", () => {
    const result = updateProfileSchema.safeParse({
      dietaryPreferences: ["vegan", "vegetarian", "keto", "paleo", "halal", "kosher"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (strict mode)", () => {
    const result = updateProfileSchema.safeParse({
      age: 25,
      userId: "injected-id", // mass-assignment attempt
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty update (all fields optional)", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ─── Workout Validation ───────────────────────────────────

describe("createWorkoutSchema", () => {
  it("accepts valid workout", () => {
    const result = createWorkoutSchema.safeParse({
      name: "Morning Lift",
      date: "2026-03-24",
      exercises: [
        { name: "Bench Press", sets: 3, reps: 10, weightKg: 60, order: 0 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects workout without name", () => {
    const result = createWorkoutSchema.safeParse({
      date: "2026-03-24",
    });
    expect(result.success).toBe(false);
  });

  it("rejects exercises array exceeding 100", () => {
    const exercises = Array.from({ length: 101 }, (_, i) => ({
      name: `Exercise ${i}`,
      order: i,
    }));
    const result = createWorkoutSchema.safeParse({
      name: "Mega Workout",
      date: "2026-03-24",
      exercises,
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (strict mode)", () => {
    const result = createWorkoutSchema.safeParse({
      name: "Workout",
      date: "2026-03-24",
      userId: "injected-id", // mass-assignment attempt
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative reps", () => {
    const result = createWorkoutSchema.safeParse({
      name: "Workout",
      date: "2026-03-24",
      exercises: [{ name: "Pushups", reps: -5, order: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

// ─── Wearable Validation ──────────────────────────────────

describe("connectWearableSchema", () => {
  it("accepts valid provider", () => {
    const result = connectWearableSchema.safeParse({ provider: "fitbit" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid provider", () => {
    const result = connectWearableSchema.safeParse({ provider: "unknown_device" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = connectWearableSchema.safeParse({
      provider: "fitbit",
      extraField: "injected",
    });
    expect(result.success).toBe(false);
  });
});

describe("wearableCallbackSchema", () => {
  it("accepts valid callback params", () => {
    const result = wearableCallbackSchema.safeParse({
      provider: "fitbit",
      code: "abc123",
      state: "state-token",
    });
    expect(result.success).toBe(true);
  });

  it("accepts error callback", () => {
    const result = wearableCallbackSchema.safeParse({
      provider: "fitbit",
      error: "access_denied",
    });
    expect(result.success).toBe(true);
  });

  it("rejects overly long code (>2048 chars)", () => {
    const result = wearableCallbackSchema.safeParse({
      provider: "fitbit",
      code: "x".repeat(2049),
    });
    expect(result.success).toBe(false);
  });
});

// ─── AI Chat Validation ───────────────────────────────────

describe("aiChatSchema", () => {
  it("accepts valid chat message", () => {
    const result = aiChatSchema.safeParse({
      message: "How many calories should I eat?",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty message (safeString allows empty after trim)", () => {
    const result = aiChatSchema.safeParse({ message: "" });
    expect(result.success).toBe(true);
  });

  it("rejects message exceeding 4000 chars", () => {
    const result = aiChatSchema.safeParse({
      message: "x".repeat(4001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects history exceeding 50 messages", () => {
    const history = Array.from({ length: 51 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}`,
    }));
    const result = aiChatSchema.safeParse({
      message: "Hello",
      history,
    });
    expect(result.success).toBe(false);
  });

  it("accepts message with valid history", () => {
    const result = aiChatSchema.safeParse({
      message: "Follow up question",
      history: [
        { role: "user", content: "First question" },
        { role: "assistant", content: "First answer" },
      ],
    });
    expect(result.success).toBe(true);
  });
});
