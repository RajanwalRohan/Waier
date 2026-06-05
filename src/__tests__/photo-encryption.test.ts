import { describe, it, expect } from "vitest";
import { safeEncrypt, safeDecrypt } from "@/lib/crypto";

// Progress photos are stored encrypted at rest (strict tier). These guard the
// guarantee at the boundary the photo routes rely on.

const SAMPLE = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQ";

describe("progress-photo encryption at rest", () => {
  it("stores ciphertext, not the original image data", () => {
    const stored = safeEncrypt(SAMPLE);
    expect(stored).not.toBe(SAMPLE);
    expect(stored).not.toContain("data:image");
  });

  it("round-trips back to the exact original on owner read", () => {
    expect(safeDecrypt(safeEncrypt(SAMPLE))).toBe(SAMPLE);
  });

  it("produces different ciphertext each time (unique IV)", () => {
    expect(safeEncrypt(SAMPLE)).not.toBe(safeEncrypt(SAMPLE));
  });

  it("is backward compatible: legacy plaintext decrypts to itself", () => {
    // A photo stored before encryption was enabled.
    expect(safeDecrypt(SAMPLE)).toBe(SAMPLE);
  });
});
