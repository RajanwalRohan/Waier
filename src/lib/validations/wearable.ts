import { z } from "zod";

const providerEnum = z.enum(["fitbit", "apple_health", "garmin", "google_fit"]);

/**
 * Wearable connection request schema.
 * SECURITY:
 *  - Provider is strictly enumerated — prevents arbitrary OAuth flows.
 *  - redirectUrl is optional and must be a valid URL if provided.
 */
export const connectWearableSchema = z
  .object({
    provider: providerEnum,
    redirectUrl: z.string().url().max(2048).optional(),
  })
  .strict();

/**
 * OAuth callback schema.
 * SECURITY:
 *  - code and state are length-limited to prevent header injection.
 *  - error is optional (providers send it on failure).
 */
export const wearableCallbackSchema = z
  .object({
    provider: providerEnum,
    code: z.string().max(2048).optional(),
    state: z.string().max(512).optional(),
    error: z.string().max(256).optional(),
  })
  .strict();

export const syncWearableSchema = z
  .object({
    provider: providerEnum,
  })
  .strict();

export type ConnectWearableInput = z.infer<typeof connectWearableSchema>;
export type WearableCallbackInput = z.infer<typeof wearableCallbackSchema>;
