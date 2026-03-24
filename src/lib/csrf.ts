/**
 * CSRF protection using the custom-header defense.
 *
 * For JSON API routes, the browser's same-origin policy prevents
 * cross-origin requests from including custom headers without a
 * CORS preflight. By requiring a custom header on all mutation
 * requests, we block CSRF attacks from simple form submissions
 * and cross-origin scripts.
 *
 * This is a defense-in-depth layer on top of:
 *  1. Content-Type enforcement in middleware (blocks non-JSON/form-data)
 *  2. SameSite cookie attribute set by NextAuth
 *  3. Origin/Referer validation
 *
 * USAGE: Call validateCsrf(request) at the top of mutation route handlers.
 * The iOS client and web frontend must include the X-Requested-With header.
 */

const CSRF_HEADER = "x-requested-with";
const EXPECTED_VALUE = "XMLHttpRequest";

/**
 * Validate that the request includes the CSRF protection header.
 * Returns true if valid, false if the request should be rejected.
 *
 * Skips validation for:
 *  - GET/HEAD/OPTIONS requests (safe methods)
 *  - Requests with no cookies (stateless/token-based auth via header)
 *  - NextAuth callback routes (handled by NextAuth's own CSRF)
 */
export function validateCsrf(request: Request): boolean {
  const method = request.method.toUpperCase();

  // Safe methods don't need CSRF protection
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;

  // Check Origin header — if present, it must match the app origin
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) return false;
    } catch {
      return false;
    }
  }

  // For API routes, require the custom header
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    // Skip CSRF for NextAuth routes (it has its own CSRF tokens)
    if (url.pathname.startsWith("/api/auth/")) return true;

    // Skip CSRF for webhook/callback routes (external callers)
    if (url.pathname.includes("/callback")) return true;

    const headerValue = request.headers.get(CSRF_HEADER);
    if (!headerValue) return false;
  }

  return true;
}

/** The header name clients must include on mutation requests. */
export const CSRF_HEADER_NAME = CSRF_HEADER;
