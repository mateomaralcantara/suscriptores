/**
 * NOWPayments IPN signature: HMAC-SHA512 (hex) of the JSON body with keys sorted recursively,
 * keyed with the IPN secret, sent in the "x-nowpayments-sig" header.
 * Only depends on node:crypto so tests can import it directly.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]));
  }
  return value;
}

export function signNowPaymentsPayload(body: unknown, secret: string) {
  return createHmac("sha512", secret).update(JSON.stringify(sortKeys(body)), "utf8").digest("hex");
}

export function verifyNowPaymentsSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return false;
  }
  const expected = Buffer.from(signNowPaymentsPayload(body, secret), "utf8");
  const given = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** order_id we send when creating an invoice: "<profile uuid>:<random>". */
export function parseTopupOrderId(orderId: unknown): string | null {
  if (typeof orderId !== "string") return null;
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):[A-Za-z0-9_-]{6,64}$/i.exec(orderId);
  return match ? match[1] : null;
}
