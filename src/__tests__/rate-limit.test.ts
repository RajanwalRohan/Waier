import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows requests within the limit", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, keyPrefix: "test-a" });
    const r1 = limiter.check("user1");
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check("user1");
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check("user1");
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, keyPrefix: "test-b" });
    limiter.check("user1");
    limiter.check("user1");

    const r3 = limiter.check("user1");
    expect(r3.success).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("isolates keys from each other", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, keyPrefix: "test-c" });
    limiter.check("user1");

    const r = limiter.check("user2");
    expect(r.success).toBe(true);
  });

  it("returns resetAt in the future", () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 30_000, keyPrefix: "test-d" });
    const r = limiter.check("user1");
    expect(r.resetAt).toBeGreaterThan(Date.now());
    expect(r.resetAt).toBeLessThanOrEqual(Date.now() + 30_000);
  });

  it("bypasses rate limiting when RATE_LIMIT_ENABLED=false", () => {
    vi.stubEnv("RATE_LIMIT_ENABLED", "false");
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, keyPrefix: "test-e" });
    limiter.check("user1");

    // Would normally be blocked
    const r = limiter.check("user1");
    expect(r.success).toBe(true);
  });
});
