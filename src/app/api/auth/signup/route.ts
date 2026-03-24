import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimiters } from "@/lib/rate-limit";
import {
  errorResponse,
  successResponse,
  rateLimitResponse,
  getClientIp,
  parseBody,
  handleApiError,
} from "@/lib/api-utils";
import { signupSchema } from "@/lib/validations/auth";

/**
 * POST /api/auth/signup
 * Register a new user with email + password.
 *
 * SECURITY:
 *  - Strict rate limiting (auth tier: 5/min per IP).
 *  - Input validated with Zod schema.
 *  - Password hashed with bcrypt (cost 12).
 *  - Email normalized to lowercase.
 *  - Generic error on duplicate email to prevent user enumeration.
 *  - No sensitive data in response.
 */
export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const ip = getClientIp(request);
    const rl = rateLimiters.auth.check(ip);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = signupSchema.parse(body);

    // Check for existing user — generic message prevents enumeration
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return errorResponse("Unable to create account. Please try again or log in.", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await db.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        profile: { create: {} },
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return successResponse({ user }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
