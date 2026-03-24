import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { rateLimiters } from "@/lib/rate-limit";
import {
  successResponse,
  rateLimitResponse,
  getClientIp,
  parseBody,
  handleApiError,
} from "@/lib/api-utils";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/forgot-password
 * Request a password reset link.
 *
 * SECURITY:
 *  - Always returns 200 regardless of whether the email exists.
 *    This prevents user enumeration.
 *  - Rate limited (auth tier: 5/min per IP).
 *  - Token is a 32-byte random hex string; only its SHA-256 hash
 *    is stored in the database. A DB leak cannot compromise tokens.
 *  - Token expires after 1 hour and is single-use.
 *  - Any existing unused tokens for the user are invalidated.
 */
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimiters.auth.check(ip);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) {
      // Still return success to not leak info
      return successResponse({ message: "If that email is registered, you will receive a reset link." });
    }

    const data = forgotPasswordSchema.parse(body);

    const user = await db.user.findUnique({
      where: { email: data.email },
      select: { id: true, email: true },
    });

    if (user) {
      // Invalidate any existing unused tokens for this user
      await db.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });

      // Generate a secure random token
      const plainToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(plainToken).digest("hex");

      await db.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Build the reset link
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${plainToken}`;

      // In production, send this via email (SendGrid, Resend, SES, etc.)
      // For now, log it to the server console for development.
      logger.info("Password reset requested", {
        email: user.email,
        resetUrl,
        expiresIn: "1 hour",
      });

      console.log("\n========================================");
      console.log("  PASSWORD RESET LINK (dev mode)");
      console.log(`  Email: ${user.email}`);
      console.log(`  Link:  ${resetUrl}`);
      console.log("  Expires in 1 hour");
      console.log("========================================\n");
    }

    // Always return the same response — never reveal if the email exists
    return successResponse({
      message: "If that email is registered, you will receive a reset link.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
