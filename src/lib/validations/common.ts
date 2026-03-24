import { z } from "zod";

/**
 * Shared validation primitives used across multiple domain schemas.
 * Centralizing these prevents inconsistency and makes it easy to
 * tighten constraints globally.
 */

/** CUID string (Prisma default ID format). */
export const cuidSchema = z.string().cuid();

/** Pagination query params — used by all list endpoints. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Date range filter — used by metrics, workouts, meals. */
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  (d) => !(d.from && d.to && d.from > d.to),
  { message: "from must be before to" },
);

/** Sort direction. */
export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

/** Safe string that strips HTML and enforces length. */
export function safeString(maxLength: number) {
  return z
    .string()
    .max(maxLength)
    .transform((s) => s.replace(/<[^>]*>/g, "").trim());
}

/** Constrained email. */
export const emailSchema = z.string().email().max(255).trim().toLowerCase();

/**
 * Password requirements (shared with frontend checklist):
 *  - 12+ characters
 *  - At least 1 uppercase letter
 *  - At least 1 lowercase letter
 *  - At least 2 numbers
 *  - At least 1 special character
 */
export const PASSWORD_RULES = {
  minLength: 12,
  maxLength: 128,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  numbers: /(?:.*\d){2,}/, // at least 2 digits anywhere
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/,
} as const;

export const passwordSchema = z
  .string()
  .min(PASSWORD_RULES.minLength, `Password must be at least ${PASSWORD_RULES.minLength} characters`)
  .max(PASSWORD_RULES.maxLength, `Password must be at most ${PASSWORD_RULES.maxLength} characters`)
  .regex(PASSWORD_RULES.uppercase, "Password must contain at least 1 uppercase letter")
  .regex(PASSWORD_RULES.lowercase, "Password must contain at least 1 lowercase letter")
  .regex(PASSWORD_RULES.numbers, "Password must contain at least 2 numbers")
  .regex(PASSWORD_RULES.special, "Password must contain at least 1 special character");
