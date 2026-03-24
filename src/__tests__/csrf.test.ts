import { describe, it, expect } from "vitest";
import { validateCsrf } from "@/lib/csrf";

function makeRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {},
): Request {
  const url = `http://localhost:3000${path}`;
  return new Request(url, {
    method,
    headers: {
      host: "localhost:3000",
      ...headers,
    },
  });
}

describe("CSRF validation", () => {
  it("allows GET requests without CSRF header", () => {
    const req = makeRequest("GET", "/api/workouts");
    expect(validateCsrf(req)).toBe(true);
  });

  it("allows HEAD and OPTIONS requests", () => {
    expect(validateCsrf(makeRequest("HEAD", "/api/profile"))).toBe(true);
    expect(validateCsrf(makeRequest("OPTIONS", "/api/profile"))).toBe(true);
  });

  it("blocks POST to /api without X-Requested-With", () => {
    const req = makeRequest("POST", "/api/workouts", {
      "content-type": "application/json",
    });
    expect(validateCsrf(req)).toBe(false);
  });

  it("allows POST with X-Requested-With header", () => {
    const req = makeRequest("POST", "/api/workouts", {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    });
    expect(validateCsrf(req)).toBe(true);
  });

  it("allows POST to NextAuth routes without CSRF header", () => {
    const req = makeRequest("POST", "/api/auth/callback/credentials", {
      "content-type": "application/json",
    });
    expect(validateCsrf(req)).toBe(true);
  });

  it("allows POST to callback routes without CSRF header", () => {
    const req = makeRequest("POST", "/api/wearables/callback", {
      "content-type": "application/json",
    });
    expect(validateCsrf(req)).toBe(true);
  });

  it("blocks cross-origin requests", () => {
    const req = makeRequest("POST", "/api/workouts", {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
      origin: "http://evil.com",
    });
    expect(validateCsrf(req)).toBe(false);
  });

  it("allows same-origin requests", () => {
    const req = makeRequest("POST", "/api/workouts", {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
      origin: "http://localhost:3000",
    });
    expect(validateCsrf(req)).toBe(true);
  });

  it("blocks PUT/PATCH/DELETE without header", () => {
    expect(validateCsrf(makeRequest("PUT", "/api/profile"))).toBe(false);
    expect(validateCsrf(makeRequest("PATCH", "/api/profile"))).toBe(false);
    expect(validateCsrf(makeRequest("DELETE", "/api/workouts/123"))).toBe(false);
  });
});
