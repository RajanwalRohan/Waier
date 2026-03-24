import { describe, it, expect, beforeEach, vi } from "vitest";
import { encrypt, decrypt, safeEncrypt, safeDecrypt } from "@/lib/crypto";

describe("crypto", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  it("encrypt + decrypt round-trips correctly", () => {
    const plaintext = "my-secret-oauth-token-12345";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (unique IV)", () => {
    const plaintext = "same-input";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
    // Both should decrypt to the same value
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it("detects tampering (GCM authentication)", () => {
    const encrypted = encrypt("secret");
    // Flip a character in the middle of the ciphertext
    const tampered =
      encrypted.slice(0, 30) +
      (encrypted[30] === "a" ? "b" : "a") +
      encrypted.slice(31);
    expect(() => decrypt(tampered)).toThrow();
  });

  it("handles empty strings", () => {
    const encrypted = encrypt("");
    expect(decrypt(encrypted)).toBe("");
  });

  it("handles unicode and special characters", () => {
    const text = "Hello 🌍! Ñ こんにちは <script>alert('xss')</script>";
    const encrypted = encrypt(text);
    expect(decrypt(encrypted)).toBe(text);
  });
});

describe("safeEncrypt / safeDecrypt", () => {
  it("safeEncrypt returns encrypted string in normal conditions", () => {
    const result = safeEncrypt("test");
    expect(result).not.toBe("test");
    expect(safeDecrypt(result)).toBe("test");
  });

  it("safeDecrypt returns original on decryption failure", () => {
    // A non-encrypted string should be returned as-is
    const result = safeDecrypt("not-encrypted-text");
    expect(result).toBe("not-encrypted-text");
  });
});
