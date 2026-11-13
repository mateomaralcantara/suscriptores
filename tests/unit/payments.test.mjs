import test from "node:test";
import assert from "node:assert/strict";
import { signStripePayload, verifyStripeSignature } from "../../lib/stripe-signature.ts";
import { parseTopupAmount } from "../../lib/order-status.ts";
import { rateLimit } from "../../lib/rate-limit.ts";

const secret = "whsec_test_secret";
const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
const now = 1_800_000_000;

test("verifyStripeSignature accepts a valid signature", () => {
  assert.equal(verifyStripeSignature(payload, signStripePayload(payload, secret, now), secret, now), true);
});

test("verifyStripeSignature accepts any matching v1 among several", () => {
  const header = `t=${now},v1=${"0".repeat(64)},${signStripePayload(payload, secret, now).split(",")[1]}`;
  assert.equal(verifyStripeSignature(payload, header, secret, now), true);
});

test("verifyStripeSignature rejects tampering, wrong secret, old timestamps and garbage", () => {
  const header = signStripePayload(payload, secret, now);
  assert.equal(verifyStripeSignature(payload + " ", header, secret, now), false, "modified body");
  assert.equal(verifyStripeSignature(payload, header, "whsec_other", now), false, "wrong secret");
  assert.equal(verifyStripeSignature(payload, header, secret, now + 301), false, "replay after tolerance");
  assert.equal(verifyStripeSignature(payload, header, secret, now - 301), false, "timestamp from the future");
  assert.equal(verifyStripeSignature(payload, null, secret, now), false, "missing header");
  assert.equal(verifyStripeSignature(payload, "t=abc,v1=zz", secret, now), false, "garbage");
  assert.equal(verifyStripeSignature(payload, `t=${now}`, secret, now), false, "no v1");
  assert.equal(verifyStripeSignature(payload, header, "", now), false, "empty secret");
});

test("parseTopupAmount converts USD to cents within limits", () => {
  assert.equal(parseTopupAmount(25), 2500);
  assert.equal(parseTopupAmount("10.50"), 1050);
  assert.equal(parseTopupAmount(5), 500);
  assert.equal(parseTopupAmount(2000), 200000);
  assert.equal(parseTopupAmount(0.1 + 0.2 + 9.7), 1000, "float noise tolerated");
});

test("parseTopupAmount rejects invalid amounts", () => {
  for (const value of [4.99, 2000.01, 10.555, -5, 0, "abc", "", null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(parseTopupAmount(value), null, String(value));
  }
});

test("rateLimit blocks after the limit and resets after the window", () => {
  const key = `test:${Math.random()}`;
  for (let i = 0; i < 3; i += 1) assert.equal(rateLimit(key, 3, 1000, 0).ok, true);
  const blocked = rateLimit(key, 3, 1000, 500);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAfterSeconds, 1);
  assert.equal(rateLimit(key, 3, 1000, 1000).ok, true, "new window");
});

test("isCronAuthorized requires the exact bearer secret", async () => {
  const { isCronAuthorized } = await import("../../lib/cron-auth.ts");
  const secret = "s3cret-value-long-enough";
  assert.equal(isCronAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(isCronAuthorized(`Bearer ${secret}x`, secret), false);
  assert.equal(isCronAuthorized(secret, secret), false, "missing Bearer");
  assert.equal(isCronAuthorized(null, secret), false);
  assert.equal(isCronAuthorized("Bearer short", "short"), false, "secrets under 16 chars are refused");
  assert.equal(isCronAuthorized("Bearer ", undefined), false);
});
