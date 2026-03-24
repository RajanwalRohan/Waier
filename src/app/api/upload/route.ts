import { rateLimiters } from "@/lib/rate-limit";
import {
  errorResponse,
  rateLimitResponse,
  getClientIp,
  handleApiError,
  requireAuthOrRespond,
  successResponse,
} from "@/lib/api-utils";
import { ALLOWED_MIME_TYPES } from "@/lib/validations/upload";
import { sanitizeFilename } from "@/lib/sanitize";
import { env } from "@/lib/env";

/**
 * POST /api/upload
 * Handle file uploads (e.g. meal photos).
 *
 * SECURITY:
 *  - Strict rate limiting (upload tier: 10/min).
 *  - MIME type validated against allowlist.
 *  - File size validated against configurable max.
 *  - Filename sanitized to prevent path traversal.
 *  - Files are NOT served directly — use signed URLs or a CDN in production.
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.upload.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return errorResponse("Expected multipart/form-data", 415);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return errorResponse("No file provided", 400);
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
      return errorResponse("File type not allowed. Accepted: JPEG, PNG, WebP, HEIC", 400);
    }

    // Validate file size
    const maxBytes = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      return errorResponse(`File too large. Maximum size: ${env.UPLOAD_MAX_SIZE_MB}MB`, 400);
    }

    // Sanitize filename
    const safeName = sanitizeFilename(file.name);
    const uniqueName = `${session.user.id}/${Date.now()}-${safeName}`;

    // TODO: In production, upload to a cloud storage provider (S3, GCS, etc.)
    // and return a signed URL. For now, return a placeholder.
    // NEVER serve uploaded files directly from the application server.

    return successResponse({
      filename: safeName,
      key: uniqueName,
      size: file.size,
      mimeType: file.type,
      // url: signedUrl — set this in production
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
