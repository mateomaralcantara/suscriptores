import test from "node:test";
import assert from "node:assert/strict";
import { calculateCharge, isValidLink, validateOrder } from "../../lib/order-rules.ts";
import { money, number } from "../../lib/format.ts";

const service = { id: "T1", platform: "Test", icon: "*", name: "Test", description: "", rate: 2.5, min: 100, max: 1000, averageTime: "1h", refillDays: 0, speed: "1K/day", quality: "Test" };
const catalog = [service];
const valid = { serviceId: "T1", link: "https://example.com/post/1", quantity: 500 };

test("calculateCharge prices per 1000 units", () => {
  assert.equal(calculateCharge(2.5, 1000), 2.5);
  assert.equal(calculateCharge(0.197, 30), 0.0059);
  assert.equal(calculateCharge(4.2, 50000), 210);
});

test("calculateCharge returns 0 for invalid or non-positive input", () => {
  for (const [rate, qty] of [[0, 100], [1, 0], [-1, 100], [1, -5], [Number.NaN, 100], [1, Number.POSITIVE_INFINITY]]) {
    assert.equal(calculateCharge(rate, qty), 0, `rate=${rate} qty=${qty}`);
  }
});

test("isValidLink accepts only http(s) URLs", () => {
  assert.equal(isValidLink("https://example.com"), true);
  assert.equal(isValidLink("http://example.com/a?b=1"), true);
  assert.equal(isValidLink("javascript:alert(1)"), false);
  assert.equal(isValidLink("ftp://example.com"), false);
  assert.equal(isValidLink("not a url"), false);
  assert.equal(isValidLink(""), false);
});

test("validateOrder accepts a valid order and computes the charge", () => {
  const result = validateOrder(valid, catalog);
  assert.equal(result.ok, true);
  assert.deepEqual(result.order, { service, link: valid.link, quantity: 500, charge: 1.25 });
});

test("validateOrder accepts numeric strings and trims the link", () => {
  const result = validateOrder({ ...valid, quantity: "100", link: "  https://example.com  " }, catalog);
  assert.equal(result.ok, true);
  assert.equal(result.order.quantity, 100);
  assert.equal(result.order.link, "https://example.com");
});

test("validateOrder enforces min and max inclusively", () => {
  assert.equal(validateOrder({ ...valid, quantity: 100 }, catalog).ok, true);
  assert.equal(validateOrder({ ...valid, quantity: 1000 }, catalog).ok, true);
  assert.ok(validateOrder({ ...valid, quantity: 99 }, catalog).errors.quantity);
  assert.ok(validateOrder({ ...valid, quantity: 1001 }, catalog).errors.quantity);
});

test("validateOrder rejects non-integer and missing quantities", () => {
  for (const quantity of [100.5, "abc", "", null, undefined, Number.NaN]) {
    const result = validateOrder({ ...valid, quantity }, catalog);
    assert.equal(result.ok, false, `quantity=${String(quantity)}`);
    assert.ok(result.errors.quantity);
  }
});

test("validateOrder rejects unknown services instead of falling back", () => {
  const result = validateOrder({ ...valid, serviceId: "NOPE" }, catalog);
  assert.equal(result.ok, false);
  assert.ok(result.errors.serviceId);
  assert.equal(validateOrder({ ...valid, serviceId: 123 }, catalog).ok, false);
});

test("validateOrder reports every invalid field at once", () => {
  const result = validateOrder({}, catalog);
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ["link", "quantity", "serviceId"]);
});

test("format helpers use es-DO locale", () => {
  assert.match(money(1234.5), /1,234\.50/);
  assert.equal(number(1000000), "1,000,000");
});

test("canCancel only allows in-flight orders", async () => {
  const { canCancel } = await import("../../lib/order-rules.ts");
  for (const status of ["queued", "processing", "submitted"]) assert.equal(canCancel(status), true, status);
  for (const status of ["completed", "canceled", "refunded", "failed"]) assert.equal(canCancel(status), false, status);
});

test("canRefill only allows delivered orders", async () => {
  const { canRefill } = await import("../../lib/order-rules.ts");
  for (const status of ["completed", "partial"]) assert.equal(canRefill(status), true, status);
  for (const status of ["queued", "processing", "canceled"]) assert.equal(canRefill(status), false, status);
});
