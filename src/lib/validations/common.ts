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

/** Secure password — min 8 chars, max 128 chars. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");
