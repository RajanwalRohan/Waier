import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify an HMAC-SHA256 webhook signature using constant-time comparison
 * to prevent timing attacks.
 *
 * @param secret  The shared webhook secret
 * @param payload The raw request body string
 * @param signature The signature from the request header (hex-encoded)
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(
  secret: string,
  payload: string,
  signature: string,
): boolean {
  if (!secret || !payload || !signature) return false;

  try {
    const expected = createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");

    // Both must be the same length for timingSafeEqual
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");

    if (sigBuf.length !== expBuf.length) return false;

    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * Check if a request IP is in the allowlist.
 * Supports individual IPs and simple CIDR /8, /16, /24 notation.
 *
 * @param clientIp The client IP address
 * @param allowlist Comma-separated list of allowed IPs/CIDRs, or undefined to allow all
 */
export function isIpAllowed(
  clientIp: string,
  allowlist: string | undefined,
): boolean {
  // No allowlist configured = allow all (dev mode)
  if (!allowlist) return true;

  const allowed = allowlist.split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return true;

  for (const entry of allowed) {
    if (entry.includes("/")) {
      // Simple CIDR match
      const [network, bits] = entry.split("/");
      const mask = ~((1 << (32 - parseInt(bits))) - 1) >>> 0;
      if (ipToInt(clientIp) !== null && ipToInt(network) !== null) {
        if ((ipToInt(clientIp)! & mask) === (ipToInt(network)! & mask)) {
          return true;
        }
      }
    } else if (clientIp === entry) {
      return true;
    }
  }

  return false;
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}
