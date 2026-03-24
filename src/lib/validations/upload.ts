import { z } from "zod";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"] as const;

/**
 * Upload validation schema.
 * SECURITY:
 *  - MIME type is strictly enumerated — prevents executable uploads.
 *  - Extension is validated as a secondary check.
 *  - File size is validated at both schema and handler level.
 *  - Filename is sanitized separately via sanitizeFilename().
 */
export const uploadMetadataSchema = z
  .object({
    filename: z.string().max(255),
    mimeType: z.enum(ALLOWED_MIME_TYPES),
    sizeBytes: z.number().int().min(1).max(10 * 1024 * 1024), // 10 MB hard max
  })
  .strict();

export { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS };
export type UploadMetadata = z.infer<typeof uploadMetadataSchema>;
