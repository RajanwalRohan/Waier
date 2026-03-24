import { z } from "zod";

/**
 * Server-side environment variable validation.
 * Imported early — if required vars are missing the app fails fast at startup.
 * SECURITY: None of these values are prefixed with NEXT_PUBLIC_ so they
 * are never bundled into the client-side JavaScript.
 */

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be ≥ 32 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  // AI — at least one provider key should be set in production
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  // Wearable OAuth credentials (optional per provider)
  FITBIT_CLIENT_ID: z.string().optional(),
  FITBIT_CLIENT_SECRET: z.string().optional(),
  GARMIN_CLIENT_ID: z.string().optional(),
  GARMIN_CLIENT_SECRET: z.string().optional(),
  GOOGLE_FIT_CLIENT_ID: z.string().optional(),
  GOOGLE_FIT_CLIENT_SECRET: z.string().optional(),

  // Encryption — used to encrypt OAuth tokens at rest
  ENCRYPTION_KEY: z.string().min(16, "ENCRYPTION_KEY must be ≥ 16 characters").optional(),

  // Upload
  UPLOAD_MAX_SIZE_MB: z.coerce.number().positive().default(5),

  // Feature flags
  RATE_LIMIT_ENABLED: z
    .enum(["true", "false", "1", "0"])
    .default("true")
    .transform((v) => v === "true" || v === "1"),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

function validateEnv() {
  // Skip validation during Next.js build phase — env vars are not available
  // at build time and will be validated at runtime instead.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return serverEnvSchema.parse({
      DATABASE_URL: "postgresql://localhost:5432/placeholder",
      NEXTAUTH_SECRET: "build-placeholder-secret-not-real-at-all!!",
      NEXTAUTH_URL: "http://localhost:3000",
    });
  }

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    console.error(`\n❌  Invalid environment variables:\n${formatted}\n`);

    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing or invalid environment variables.");
    }
  }

  // In non-production we allow partial config so devs can start quickly
  return (result.success ? result.data : serverEnvSchema.parse({
    ...process.env,
    // Provide safe defaults for optional fields so parse doesn't throw twice
    DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost:5432/ai_health_coach",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "dev-secret-CHANGE-ME-in-production!!",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  }));
}

export const env = validateEnv();
