import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimiters } from "@/lib/rate-limit";
import {
  successResponse,
  errorResponse,
  rateLimitResponse,
  getClientIp,
  parseBody,
  handleApiError,
} from "@/lib/api-utils";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/reset-password
 * Reset a user's password using a valid reset token.
 *
 * SECURITY:
 *  - Rate limited (auth tier: 5/min per IP).
 *  - Token is hashed (SHA-256) before lookup — plaintext never stored.
 *  - Token must not be expired (1-hour TTL) and must be unused.
 *  - Token is marked as used immediately (single-use).
 *  - New password must meet strength requirements (12+ chars, etc.).
 *  - Generic error messages prevent token enumeration.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimiters.auth.check(ip);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = resetPasswordSchema.parse(body);

    // Hash the incoming token to match against stored hash
    const tokenHash = createHash("sha256").update(data.token).digest("hex");

    const resetToken = await db.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.used) {
      return errorResponse("Invalid or expired reset link. Please request a new one.", 400);
    }

    if (resetToken.expiresAt < new Date()) {
      // Mark expired token as used to clean it up
      await db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });
      return errorResponse("This reset link has expired. Please request a new one.", 400);
    }

    // Mark token as used BEFORE updating password (prevents race conditions)
    await db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Hash the new password and update the user
    const passwordHash = await bcrypt.hash(data.password, 12);

    await db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    // Invalidate all other unused reset tokens for this user
    await db.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, used: false },
      data: { used: true },
    });

    logger.info("Password reset completed", { userId: resetToken.userId });

    return successResponse({
      message: "Your password has been reset. You can now sign in.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
