import { describe, it, expect } from "vitest";
import {
  getClientIp,
  parseBody,
  successResponse,
  errorResponse,
} from "@/lib/api-utils";

// ─── Client IP Extraction ─────────────────────────────────

describe("getClientIp", () => {
  it("extracts IP from X-Forwarded-For header", () => {
    const req = new Request("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("extracts IP from X-Real-Ip header", () => {
    const req = new Request("http://localhost:3000/api/test", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("returns 'unknown' when no IP headers present", () => {
    const req = new Request("http://localhost:3000/api/test");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("prefers X-Forwarded-For over X-Real-Ip", () => {
    const req = new Request("http://localhost:3000/api/test", {
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
      },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });
});

// ─── Body Parsing ─────────────────────────────────────────

describe("parseBody", () => {
  it("parses valid JSON body", async () => {
    const req = new Request("http://localhost:3000/api/test", {
      method: "POST",
      body: JSON.stringify({ key: "value" }),
      headers: { "content-type": "application/json" },
    });
    const result = await parseBody(req);
    expect(result).toEqual({ key: "value" });
  });

  it("returns null for invalid JSON", async () => {
    const req = new Request("http://localhost:3000/api/test", {
      method: "POST",
      body: "not-json{{{",
      headers: { "content-type": "application/json" },
    });
    const result = await parseBody(req);
    expect(result).toBeNull();
  });

  it("returns null for empty body", async () => {
    const req = new Request("http://localhost:3000/api/test", {
      method: "POST",
      body: "",
    });
    const result = await parseBody(req);
    expect(result).toBeNull();
  });

  it("rejects body exceeding 1 MB via Content-Length", async () => {
    const req = new Request("http://localhost:3000/api/test", {
      method: "POST",
      body: "x",
      headers: { "content-length": String(2 * 1024 * 1024) },
    });
    const result = await parseBody(req);
    expect(result).toBeNull();
  });
});

// ─── Response Helpers ─────────────────────────────────────

describe("successResponse", () => {
  it("returns JSON with success: true", async () => {
    const res = successResponse({ id: "123" });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: "123" });
  });

  it("supports custom status codes", async () => {
    const res = successResponse({ created: true }, 201);
    expect(res.status).toBe(201);
  });
});

describe("errorResponse", () => {
  it("returns JSON with success: false", async () => {
    const res = errorResponse("Not found", 404);
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Not found");
  });

  it("includes field errors when provided", async () => {
    const res = errorResponse("Validation failed", 400, [
      { field: "email", message: "Required" },
    ]);
    const body = await res.json();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].field).toBe("email");
  });
});
