import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../../lib/errors.ts";
import { microsToUsd, orderCostMicros, usdToMicros } from "../../lib/money.ts";
import { orderServices } from "../../lib/order-services.ts";
import { isValidLink, normalizeEmail, parseCredentials, parseDepositAmount, parseOrderInput, parseRegistration } from "../../lib/validation.ts";

const service = orderServices[0];
const validOrder = { serviceId: service.id, link: "https://example.com/post/1", quantity: service.min };

function rejects(fn: () => unknown, status: number, code: string) {
  assert.throws(fn, (error: unknown) => error instanceof ApiError && error.status === status && error.code === code);
}

test("order cost uses integer micro-dollars with no float drift", () => {
  assert.equal(orderCostMicros(0.197, 1000), 197_000);
  assert.equal(orderCostMicros(0.197, 30), 5_910);
  assert.equal(microsToUsd(orderCostMicros(0.1, 3000)), 0.3);
  assert.equal(usdToMicros(0.1) + usdToMicros(0.2), usdToMicros(0.3));
});

test("every catalog service has a coherent price and range", () => {
  assert.equal(new Set(orderServices.map((item) => item.id)).size, orderServices.length);
  for (const item of orderServices) {
    assert.ok(item.rate > 0, item.id);
    assert.ok(Math.abs(item.rate * 1000 - Math.round(item.rate * 1000)) < 1e-6, `${item.id}: rate has more than 3 decimals`);
    assert.ok(Number.isInteger(item.min) && item.min > 0 && item.max >= item.min, item.id);
    assert.ok(orderCostMicros(item.rate, item.min) > 0, item.id);
  }
});

test("a valid order is parsed and resolved against the catalog", () => {
  const parsed = parseOrderInput(validOrder);
  assert.equal(parsed.service.id, service.id);
  assert.equal(parsed.quantity, service.min);
});

test("legacy field names (service/target) are accepted", () => {
  assert.equal(parseOrderInput({ service: service.id, target: validOrder.link, quantity: service.min }).link, validOrder.link);
});

test("an unknown service is rejected instead of falling back to another one", () => {
  rejects(() => parseOrderInput({ ...validOrder, serviceId: "does-not-exist" }), 422, "validation_failed");
});

test("quantities outside the service range or non-integers are rejected, not clamped", () => {
  for (const quantity of [service.min - 1, service.max + 1, service.min + 0.5, "100", null, NaN, -5]) {
    rejects(() => parseOrderInput({ ...validOrder, quantity }), 422, "validation_failed");
  }
  assert.equal(parseOrderInput({ ...validOrder, quantity: service.max }).quantity, service.max);
});

test("links must be absolute http(s) URLs", () => {
  assert.equal(isValidLink("https://example.com/a?b=1"), true);
  for (const link of ["javascript:alert(1)", "ftp://example.com", "example.com", "", 42, `https://example.com/${"a".repeat(2100)}`]) {
    assert.equal(isValidLink(link), false, String(link).slice(0, 30));
  }
});

test("all problems of an order are reported together", () => {
  try {
    parseOrderInput({ serviceId: "nope", link: "bad", quantity: 1.5 });
    assert.fail("should have thrown");
  } catch (error) {
    assert.ok(error instanceof ApiError);
    assert.equal((error.details as string[]).length, 3);
  }
});

test("non-object bodies are a 400", () => {
  for (const body of [null, [], "text", 5]) rejects(() => parseOrderInput(body), 400, "invalid_body");
});

test("emails are normalized and validated", () => {
  assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
  for (const email of ["no-at", "a@b", "a b@c.com", 5, ""]) assert.equal(normalizeEmail(email), null);
});

test("credentials and registration are validated", () => {
  assert.deepEqual(parseCredentials({ email: "A@b.co", password: "x" }), { email: "a@b.co", password: "x" });
  rejects(() => parseCredentials({ email: "a@b.co" }), 422, "validation_failed");
  assert.equal(parseRegistration({ email: "a@b.co", name: " Ana ", password: "Abcdefgh12" }).name, "Ana");
  rejects(() => parseRegistration({ email: "a@b.co", name: "Ana", password: "weak" }), 422, "validation_failed");
  rejects(() => parseRegistration({ email: "bad", name: "A", password: "Abcdefgh12" }), 422, "validation_failed");
});

test("deposit amounts are bounded and limited to cents", () => {
  assert.equal(parseDepositAmount({ amount: 100 }), 100);
  assert.equal(parseDepositAmount({ amount: 19.99 }), 19.99);
  for (const amount of [0, -5, 10_001, 1.005, "100", Infinity, NaN, undefined]) {
    rejects(() => parseDepositAmount({ amount }), 422, "validation_failed");
  }
});
