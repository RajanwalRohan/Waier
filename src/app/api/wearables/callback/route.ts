import { db } from "@/lib/db";
import { rateLimiters } from "@/lib/rate-limit";
import {
  successResponse,
  errorResponse,
  rateLimitResponse,
  getClientIp,
  handleApiError,
  requireAuthOrRespond,
} from "@/lib/api-utils";
import { wearableCallbackSchema } from "@/lib/validations/wearable";
import { safeEncrypt } from "@/lib/crypto";

/**
 * GET /api/wearables/callback
 * Handle OAuth callback from wearable providers.
 *
 * SECURITY:
 *  - Validates provider, code, and state params.
 *  - State is verified against server-side store with TTL and ownership check.
 *  - Tokens are stored encrypted via AES-256-GCM (application-layer encryption).
 *  - Rate limited to prevent callback replay attacks.
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.webhook.check(ip);
    if (!rl.success) return rateLimitResponse(rl);

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const data = wearableCallbackSchema.parse(params);

    if (data.error) {
      return errorResponse("Authorization was denied by the provider", 400);
    }

    if (!data.code) {
      return errorResponse("Missing authorization code", 400);
    }

    // Verify state parameter against server-side store to prevent CSRF
    if (!data.state) {
      return errorResponse("Missing state parameter", 400);
    }

    const storedState = await db.oAuthState.findUnique({
      where: { state: data.state },
    });

    if (!storedState) {
      return errorResponse("Invalid or expired state parameter", 400);
    }

    // Verify state belongs to this user and hasn't expired
    if (storedState.userId !== session.user.id) {
      return errorResponse("Invalid state parameter", 400);
    }

    if (storedState.expiresAt < new Date()) {
      await db.oAuthState.delete({ where: { id: storedState.id } });
      return errorResponse("State parameter has expired. Please try connecting again.", 400);
    }

    // Delete used state token (single-use)
    await db.oAuthState.delete({ where: { id: storedState.id } });

    // TODO: Exchange authorization code for tokens via provider API
    // For now, we encrypt the placeholder token to demonstrate the pattern
    const encryptedToken = safeEncrypt("PLACEHOLDER_EXCHANGE_CODE_FOR_TOKEN");

    // Store the connection with encrypted tokens
    await db.wearableConnection.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: data.provider,
        },
      },
      create: {
        userId: session.user.id,
        provider: data.provider,
        accessToken: encryptedToken,
        isActive: true,
        scopes: "[]",
      },
      update: {
        accessToken: encryptedToken,
        isActive: true,
      },
    });

    return successResponse({ connected: true, provider: data.provider });
  } catch (err) {
    return handleApiError(err);
  }
}
