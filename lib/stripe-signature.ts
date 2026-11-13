/**
 * Stripe webhook signature verification (scheme v1, HMAC-SHA256 over "<t>.<raw body>").
 * Only depends on node:crypto so tests can import it directly.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

export function signStripePayload(payload: string, secret: string, timestamp: number) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = STRIPE_SIGNATURE_TOLERANCE_SECONDS,
): boolean {
  if (!header || !secret) return false;
  let timestamp = Number.NaN;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2).map((item) => item?.trim());
    if (key === "t") timestamp = Number(value);
    if (key === "v1" && value) signatures.push(value);
  }
  if (!Number.isInteger(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex"), "utf8");
  return signatures.some((candidate) => {
    const given = Buffer.from(candidate, "utf8");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
