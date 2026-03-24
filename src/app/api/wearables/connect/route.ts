import { db } from "@/lib/db";
import { rateLimiters } from "@/lib/rate-limit";
import {
  successResponse,
  errorResponse,
  rateLimitResponse,
  getClientIp,
  parseBody,
  handleApiError,
  requireAuthOrRespond,
} from "@/lib/api-utils";
import { connectWearableSchema } from "@/lib/validations/wearable";
import { env } from "@/lib/env";

/**
 * POST /api/wearables/connect
 * Initiate a wearable OAuth connection flow.
 *
 * SECURITY:
 *  - Provider strictly validated via enum.
 *  - OAuth client secrets remain server-side.
 *  - State parameter generated server-side for CSRF protection.
 *  - Returns only the authorize URL — secrets never sent to client.
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    if (!body) return errorResponse("Invalid request body", 400);

    const data = connectWearableSchema.parse(body);

    // Generate a CSRF state token
    const state = crypto.randomUUID();

    // Build provider-specific OAuth URL using URLSearchParams to prevent
    // parameter injection via env var values.
    let authorizeUrl: string;

    switch (data.provider) {
      case "fitbit": {
        if (!env.FITBIT_CLIENT_ID) {
          return errorResponse("This integration is not configured", 501);
        }
        const url = new URL("https://www.fitbit.com/oauth2/authorize");
        url.searchParams.set("client_id", env.FITBIT_CLIENT_ID);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", "activity heartrate sleep");
        url.searchParams.set("state", state);
        authorizeUrl = url.toString();
        break;
      }
      case "google_fit": {
        if (!env.GOOGLE_FIT_CLIENT_ID) {
          return errorResponse("This integration is not configured", 501);
        }
        const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        url.searchParams.set("client_id", env.GOOGLE_FIT_CLIENT_ID);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", "https://www.googleapis.com/auth/fitness.activity.read");
        url.searchParams.set("state", state);
        authorizeUrl = url.toString();
        break;
      }
      default:
        return errorResponse("Provider not yet supported", 501);
    }

    // Store state token in DB with 10-minute expiry for CSRF verification on callback
    await db.oAuthState.create({
      data: {
        state,
        userId: session.user.id,
        provider: data.provider,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return successResponse({ authorizeUrl, state });
  } catch (err) {
    return handleApiError(err);
  }
}
