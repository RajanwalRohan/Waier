import { describe, it, expect } from "vitest";
import {
  sanitizeString,
  sanitizeForAI,
  sanitizeFilename,
  normalizeWhitespace,
} from "@/lib/sanitize";

describe("sanitizeString", () => {
  it("strips HTML tags", () => {
    expect(sanitizeString("<b>hello</b>")).toBe("hello");
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(sanitizeString("<img src=x onerror=alert(1)>")).toBe("");
  });

  it("trims whitespace", () => {
    expect(sanitizeString("  hello world  ")).toBe("hello world");
  });

  it("handles empty strings", () => {
    expect(sanitizeString("")).toBe("");
  });

  it("preserves clean text", () => {
    expect(sanitizeString("Hello, World!")).toBe("Hello, World!");
  });
});

describe("sanitizeForAI", () => {
  it("caps length at default 4000", () => {
    const long = "x".repeat(5000);
    expect(sanitizeForAI(long).length).toBe(4000);
  });

  it("caps at custom max length", () => {
    expect(sanitizeForAI("hello world", 5)).toBe("hello");
  });

  it("strips HTML before capping", () => {
    expect(sanitizeForAI("<b>hi</b>", 100)).toBe("hi");
  });
});

describe("sanitizeFilename", () => {
  it("prevents directory traversal", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("..");
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
  });

  it("removes path separators", () => {
    expect(sanitizeFilename("path/to/file.txt")).not.toContain("/");
    expect(sanitizeFilename("path\\to\\file.txt")).not.toContain("\\");
  });

  it("removes null bytes", () => {
    expect(sanitizeFilename("file\0.txt")).not.toContain("\0");
  });

  it("prevents hidden files", () => {
    const result = sanitizeFilename(".htaccess");
    expect(result[0]).not.toBe(".");
  });

  it("limits length to 200", () => {
    const long = "a".repeat(300) + ".txt";
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(200);
  });

  it("returns 'unnamed' for empty/invalid input", () => {
    expect(sanitizeFilename("")).toBe("unnamed");
    expect(sanitizeFilename("...")).toBe("unnamed");
  });

  it("preserves safe filenames", () => {
    expect(sanitizeFilename("photo_2024.jpg")).toBe("photo_2024.jpg");
  });
});

describe("normalizeWhitespace", () => {
  it("collapses multiple spaces", () => {
    expect(normalizeWhitespace("hello   world")).toBe("hello world");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalizeWhitespace("  hello  ")).toBe("hello");
  });

  it("collapses tabs and newlines", () => {
    expect(normalizeWhitespace("hello\n\tworld")).toBe("hello world");
  });
});
