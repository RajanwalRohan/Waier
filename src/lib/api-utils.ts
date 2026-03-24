import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";
import { getServerSession } from "./auth";
import { AuthError } from "./auth";
import type { RateLimitResult } from "./rate-limit";
import { logger } from "./logger";

// ─── Standardized API Responses ────────────────────────────

/**
 * Return a JSON success response.
 * SECURITY: Never include internal details — only the data the client needs.
 */
export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Return a JSON error response.
 * SECURITY: `message` should be a user-safe string. Never include stack
 * traces, provider names, or internal error details.
 */
export function errorResponse(message: string, status: number, errors?: unknown) {
  const body: Record<string, unknown> = { success: false, error: message };
  if (errors) body.errors = errors;
  return NextResponse.json(body, { status });
}

/** Return a 429 with standard rate-limit headers. */
export function rateLimitResponse(result: RateLimitResult) {
  const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { success: false, error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(result.resetAt),
      },
    },
  );
}

// ─── Request Helpers ───────────────────────────────────────

/**
 * Extract the client IP address from the request.
 * Respects common proxy headers (X-Forwarded-For, X-Real-Ip).
 * Falls back to "unknown" — never throws.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  // X-Forwarded-For may contain a comma-separated list; take the first (client) IP
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return headers.get("x-real-ip") ?? "unknown";
}

/**
 * Safely parse a JSON request body.
 * Returns null on parse failure rather than throwing, so callers can
 * return a controlled 400 instead of a 500.
 *
 * SECURITY: Rejects bodies over 1 MB to prevent memory exhaustion.
 */
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

export async function parseBody(request: Request): Promise<unknown> {
  try {
    // Check Content-Length header as a fast pre-check (not authoritative)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return null;
    }

    const text = await request.text();
    if (!text) return null;
    if (text.length > MAX_BODY_BYTES) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Validate a parsed body against a Zod schema.
 * Throws a ZodError on failure — callers should catch it via handleApiError.
 */
export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}

// ─── Auth Helper ───────────────────────────────────────────

/**
 * Require an authenticated session or return a 401 response.
 * Usage: const session = await requireAuthOrRespond(); if (!session) return;
 */
export async function requireAuthOrRespond() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return null;
  }
  return session;
}

// ─── Global Error Handler ──────────────────────────────────

/**
 * Catch-all error handler for API routes. Maps known error types to
 * appropriate HTTP status codes and always returns a safe message.
 *
 * Usage:
 *   try { ... } catch (err) { return handleApiError(err); }
 */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return errorResponse("Authentication required", 401);
  }

  if (err instanceof ZodError) {
    // Return field-level errors so the client can display them,
    // but never expose raw Zod internals.
    const fieldErrors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    return errorResponse("Validation failed", 400, fieldErrors);
  }

  // Unknown / unexpected errors — log server-side, return generic message
  logger.error("Unhandled API error", {
    error: err instanceof Error ? err.message : String(err),
  });
  return errorResponse("An unexpected error occurred", 500);
}
