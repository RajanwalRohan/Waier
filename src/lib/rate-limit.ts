/**
 * In-memory sliding-window rate limiter.
 *
 * PRODUCTION NOTE: Replace the in-memory Map with a Redis-backed store
 * (e.g. @upstash/ratelimit) for multi-instance deployments. The API
 * surface stays the same.
 *
 * SECURITY: Rate limiting is applied per-IP for unauthenticated routes
 * and per-userId for authenticated routes to prevent abuse.
 */

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Namespace prefix to isolate different limiters. */
  keyPrefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix timestamp (ms) when the window resets. */
  resetAt: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Garbage-collect expired entries every 60 s to prevent memory leaks.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.resetAt <= now) store.delete(key);
    });
  }, 60_000).unref?.();
}

export function createRateLimiter(config: RateLimitConfig) {
  const { limit, windowMs, keyPrefix = "rl" } = config;

  return {
    check(key: string): RateLimitResult {
      // Allow bypass via env flag for testing/dev. Always enforce in production.
      if (
        process.env.RATE_LIMIT_ENABLED === "false" ||
        process.env.RATE_LIMIT_ENABLED === "0"
      ) {
        return { success: true, limit, remaining: limit, resetAt: Date.now() + windowMs };
      }
      const fullKey = `${keyPrefix}:${key}`;
      const now = Date.now();
      const entry = store.get(fullKey);

      // First request or window expired — start fresh
      if (!entry || entry.resetAt <= now) {
        store.set(fullKey, { count: 1, resetAt: now + windowMs });
        return { success: true, limit, remaining: limit - 1, resetAt: now + windowMs };
      }

      // Window still active — check quota
      if (entry.count >= limit) {
        return { success: false, limit, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count += 1;
      return { success: true, limit, remaining: limit - entry.count, resetAt: entry.resetAt };
    },
  };
}

/**
 * Pre-configured limiters grouped by endpoint sensitivity.
 * Values are tuned for a single-instance deployment; scale down
 * per-instance if running behind a load balancer with shared state.
 */
export const rateLimiters = {
  /** Login / signup / password reset — very strict. */
  auth: createRateLimiter({ limit: 5, windowMs: 60_000, keyPrefix: "auth" }),
  /** AI chat / coaching — strict to prevent cost abuse. */
  ai: createRateLimiter({ limit: 20, windowMs: 60_000, keyPrefix: "ai" }),
  /** General read endpoints (dashboard, lists). */
  general: createRateLimiter({ limit: 60, windowMs: 60_000, keyPrefix: "general" }),
  /** Create / update / delete mutations. */
  mutation: createRateLimiter({ limit: 30, windowMs: 60_000, keyPrefix: "mutation" }),
  /** Photo / file uploads. */
  upload: createRateLimiter({ limit: 10, windowMs: 60_000, keyPrefix: "upload" }),
  /** Wearable data sync. */
  wearableSync: createRateLimiter({ limit: 10, windowMs: 60_000, keyPrefix: "wearable" }),
  /** Inbound webhooks. */
  webhook: createRateLimiter({ limit: 30, windowMs: 60_000, keyPrefix: "webhook" }),
};
