/**
 * Input sanitization helpers.
 *
 * React already escapes rendered values, so these are mainly for:
 *  1. Cleaning data before database storage.
 *  2. Preventing stored XSS if content is ever rendered with dangerouslySetInnerHTML.
 *  3. Normalizing user input (trimming, casing).
 *  4. Cleaning filenames for upload safety.
 *  5. Preparing user text before sending to AI providers.
 */

/** Strip HTML tags and trim whitespace. */
export function sanitizeString(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/** Sanitize a string intended for AI prompt use — strip tags, cap length. */
export function sanitizeForAI(input: string, maxLength = 4000): string {
  return sanitizeString(input).slice(0, maxLength);
}

/**
 * Sanitize a filename to prevent path traversal and shell metacharacter abuse.
 * Keeps only alphanumeric, hyphens, underscores, and a single dot for extension.
 */
export function sanitizeFilename(input: string): string {
  // Remove path separators and null bytes
  const stripped = input
    .replace(/[\\/\0]/g, "")
    .replace(/\.\./g, ""); // prevent directory traversal

  // Keep only safe characters
  const safe = stripped.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Prevent hidden files and limit length
  const final = safe.replace(/^\.+/, "").slice(0, 200);

  return final || "unnamed";
}

/** Trim + collapse internal whitespace to single spaces. */
export function normalizeWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}
