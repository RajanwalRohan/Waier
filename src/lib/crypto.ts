import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

/**
 * AES-256-GCM encryption utilities for sensitive data at rest.
 *
 * Used to encrypt OAuth tokens, refresh tokens, and other secrets
 * stored in the database. Each encrypted value includes a unique IV
 * and authentication tag, so identical plaintexts produce different
 * ciphertexts.
 *
 * SECURITY:
 *  - AES-256-GCM provides authenticated encryption (confidentiality + integrity).
 *  - A unique 12-byte IV is generated per encryption call.
 *  - The 16-byte auth tag prevents tampering.
 *  - The encryption key is derived from ENCRYPTION_KEY env var via SHA-256.
 *  - If ENCRYPTION_KEY is not set, encryption is a no-op in development
 *    and throws in production.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 16;

/**
 * Derive a 32-byte key from the env var.
 * SHA-256 ensures consistent key length regardless of input.
 */
function getKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;

  if (!envKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY is required in production");
    }
    // Dev fallback — NOT secure, just prevents crashes during local dev
    return createHash("sha256").update("dev-encryption-key-NOT-SECURE").digest();
  }

  return createHash("sha256").update(envKey).digest();
}

/**
 * Encrypt a plaintext string.
 * Returns a hex-encoded string: iv + ciphertext + authTag
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  // Concatenate iv + encrypted + tag, all hex-encoded
  return iv.toString("hex") + encrypted + tag.toString("hex");
}

/**
 * Decrypt a hex-encoded encrypted string.
 * Expects the format produced by encrypt(): iv + ciphertext + authTag
 */
export function decrypt(encryptedHex: string): string {
  const key = getKey();

  // Extract components
  const ivHex = encryptedHex.slice(0, IV_LENGTH * 2);
  const tagHex = encryptedHex.slice(-TAG_LENGTH * 2);
  const ciphertextHex = encryptedHex.slice(IV_LENGTH * 2, -TAG_LENGTH * 2);

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Safely encrypt — returns the encrypted string, or the original
 * plaintext if encryption fails (with a warning). This prevents
 * the app from crashing if encryption isn't configured yet.
 */
export function safeEncrypt(plaintext: string): string {
  try {
    return encrypt(plaintext);
  } catch (err) {
    console.warn("[crypto] Encryption failed, storing plaintext:", err instanceof Error ? err.message : "unknown");
    return plaintext;
  }
}

/**
 * Safely decrypt — returns the decrypted string, or the original
 * value if decryption fails (e.g., the value was stored before
 * encryption was enabled).
 */
export function safeDecrypt(encrypted: string): string {
  try {
    return decrypt(encrypted);
  } catch {
    // Value may have been stored unencrypted before encryption was enabled
    return encrypted;
  }
}
