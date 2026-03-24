import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateCsrf } from "@/lib/csrf";

/**
 * Next.js edge middleware — runs before every request.
 *
 * Responsibilities:
 *  1. Attach security headers to all responses.
 *  2. Generate a unique request ID for tracing.
 *  3. Block requests with suspicious content-type on mutation routes.
 *  4. Validate CSRF custom-header defense on API mutation routes.
 */

export function middleware(request: NextRequest) {
  // ── CSRF Custom-Header Defense ────────────────────────────
  if (!validateCsrf(request)) {
    return NextResponse.json(
      { success: false, error: "CSRF validation failed" },
      { status: 403 },
    );
  }

  const response = NextResponse.next();
  const nonce = crypto.randomUUID();

  // ── Security Headers ──────────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  // CSP: Next.js injects inline scripts for hydration/data, so we must
  // allow 'unsafe-inline' for script-src. To upgrade to nonce-based CSP,
  // enable experimental.appDir csp nonce support in next.config.ts.
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );

  // ── Request ID for tracing / debugging ────────────────────
  response.headers.set("X-Request-Id", nonce);

  // ── Block non-JSON bodies on API mutation routes ──────────
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const method = request.method.toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const contentType = request.headers.get("content-type") ?? "";
      // Allow JSON, form-data (for uploads), and empty bodies
      const allowed =
        contentType.includes("application/json") ||
        contentType.includes("multipart/form-data") ||
        contentType === "";
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "Unsupported content type" },
          { status: 415 },
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
