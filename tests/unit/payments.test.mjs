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

test("parseBulkOrders accepts | ; tab and comma separators", async () => {
  const { parseBulkOrders } = await import("../../lib/bulk-orders.ts");
  const { rows, errors } = parseBulkOrders("# comentario\n123 | https://a.com/p | 100\n456;https://b.com;200\n789\thttps://c.com\t300\n10, https://d.com/x?a=1, 50\n\n");
  assert.deepEqual(errors, []);
  assert.deepEqual(rows.map((r) => [r.line, r.serviceId, r.link, r.quantity]), [
    [2, "123", "https://a.com/p", 100], [3, "456", "https://b.com", 200], [4, "789", "https://c.com", 300], [5, "10", "https://d.com/x?a=1", 50],
  ]);
});

test("parseBulkOrders reports bad lines and the row limit", async () => {
  const { parseBulkOrders } = await import("../../lib/bulk-orders.ts");
  const { errors } = parseBulkOrders("abc | https://a.com | 10\n1 | https://a.com | -5\n1 | https://a.com");
  assert.deepEqual(errors.map((e) => e.line), [1, 2, 3]);
  const many = Array.from({ length: 101 }, () => "1 | https://a.com | 10").join("\n");
  assert.ok(parseBulkOrders(many).errors.some((e) => e.line === 0));
});

test("drip-feed is validated and billed per run", async () => {
  const { parseDripFeed, billableQuantity } = await import("../../lib/order-status.ts");
  assert.equal(parseDripFeed(undefined, undefined), null);
  assert.equal(parseDripFeed("", ""), null);
  assert.deepEqual(parseDripFeed(5, 60), { runs: 5, interval: 60 });
  assert.equal(typeof parseDripFeed(1, 60), "string", "1 run is not drip-feed");
  assert.equal(typeof parseDripFeed(101, 60), "string");
  assert.equal(typeof parseDripFeed(5, 0), "string");
  assert.equal(typeof parseDripFeed(5, 1441), "string");
  assert.equal(typeof parseDripFeed(2.5, 10), "string");
  assert.equal(billableQuantity(500, { runs: 5, interval: 60 }), 2500);
  assert.equal(billableQuantity(500, null), 500);
});

test("API keys: format, hashing and status mapping", async () => {
  const { generateApiKey, parseApiKey, apiKeyMatches, hashApiKey, toApiV2Status } = await import("../../lib/api-keys.ts");
  const { key, prefix, hash } = generateApiKey();
  assert.match(key, /^gr_[a-f0-9]{12}_[A-Za-z0-9_-]{43}$/);
  assert.equal(parseApiKey(key)?.prefix, prefix);
  assert.equal(hash, hashApiKey(key));
  assert.equal(apiKeyMatches(key, hash), true);
  assert.equal(apiKeyMatches(key + "x", hash), false);
  assert.equal(parseApiKey("gr_short_key"), null);
  assert.notEqual(generateApiKey().key, key, "keys are random");
  assert.equal(toApiV2Status("processing"), "In progress");
  assert.equal(toApiV2Status("pending_provider"), "Pending");
  assert.equal(toApiV2Status("failed"), "Canceled");
  assert.equal(toApiV2Status("partial"), "Partial");
});
