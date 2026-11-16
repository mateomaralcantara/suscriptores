import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMarkup,
  canCancelOrder,
  canRefillOrder,
  isHttpUrl,
  isTerminalStatus,
  normalizeProviderStatus,
  orderCostMinor,
  parseMarkupPercent,
  refundForStatus,
} from "../../lib/order-status.ts";
import { iconForPlatform, inferPlatform, orderPlatforms } from "../../lib/order-services.ts";

test("normalizeProviderStatus maps provider strings", () => {
  assert.equal(normalizeProviderStatus("Completed"), "completed");
  assert.equal(normalizeProviderStatus(" Partial "), "partial");
  assert.equal(normalizeProviderStatus("Canceled"), "canceled");
  assert.equal(normalizeProviderStatus("Cancelled"), "canceled");
  assert.equal(normalizeProviderStatus("In progress"), "processing");
  assert.equal(normalizeProviderStatus("Processing"), "processing");
  assert.equal(normalizeProviderStatus("Pending"), "queued");
  assert.equal(normalizeProviderStatus("weird"), null);
  assert.equal(normalizeProviderStatus(undefined), null);
  assert.equal(normalizeProviderStatus(null), null);
});

test("terminal statuses are final", () => {
  for (const status of ["completed", "partial", "canceled", "failed", "refunded"]) assert.equal(isTerminalStatus(status), true, status);
  for (const status of ["queued", "processing", "cancel_requested", "pending_provider", "provider_unknown"]) assert.equal(isTerminalStatus(status), false, status);
});

test("canCancelOrder requires a provider id and an in-flight status", () => {
  assert.equal(canCancelOrder({ status: "queued", provider_order_id: "1" }), true);
  assert.equal(canCancelOrder({ status: "processing", provider_order_id: "1" }), true);
  assert.equal(canCancelOrder({ status: "queued", provider_order_id: null }), false);
  for (const status of ["completed", "partial", "canceled", "failed", "cancel_requested", "provider_unknown", "pending_provider"]) {
    assert.equal(canCancelOrder({ status, provider_order_id: "1" }), false, status);
  }
});

test("canRefillOrder only for delivered orders", () => {
  assert.equal(canRefillOrder({ status: "completed", provider_order_id: "1" }), true);
  assert.equal(canRefillOrder({ status: "partial", provider_order_id: "1" }), true);
  assert.equal(canRefillOrder({ status: "completed", provider_order_id: "" }), false);
  assert.equal(canRefillOrder({ status: "processing", provider_order_id: "1" }), false);
});

test("refundForStatus matches the SQL settlement rules", () => {
  assert.equal(refundForStatus("canceled", 300, 100, null), 300);
  assert.equal(refundForStatus("partial", 200, 100, 25), 50);
  assert.equal(refundForStatus("partial", 100, 3, 1), 33, "rounds down");
  assert.equal(refundForStatus("partial", 100, 10, 999999), 100, "remains clamped to quantity");
  assert.equal(refundForStatus("partial", 100, 10, -5), 0, "negative remains -> 0");
  assert.equal(refundForStatus("partial", 100, 10, null), 0, "unknown remains -> no refund");
  assert.equal(refundForStatus("completed", 100, 10, 5), 0);
  assert.equal(refundForStatus("processing", 100, 10, 5), 0);
});

test("pricing: markup and cost in cents", () => {
  assert.equal(applyMarkup(1, 30), 1.3);
  assert.equal(applyMarkup(2, 0), 2);
  assert.equal(orderCostMinor(1.3, 1000), 130);
  assert.equal(orderCostMinor(1.3, 1), 1, "never below one cent");
  assert.equal(orderCostMinor(0.123, 1000), 13, "rounds up");
  assert.equal(orderCostMinor(1.2, 10000), 1200, "float noise does not add a cent");
  assert.equal(orderCostMinor(0.1 * 3, 1000), 30, "0.30000000000000004 -> 30");
});

test("parseMarkupPercent falls back to 30 on invalid input", () => {
  assert.equal(parseMarkupPercent("45"), 45);
  assert.equal(parseMarkupPercent("0"), 0);
  assert.equal(parseMarkupPercent(undefined), 30);
  assert.equal(parseMarkupPercent(""), 30);
  assert.equal(parseMarkupPercent("-10"), 30);
  assert.equal(parseMarkupPercent("abc"), 30);
});

test("isHttpUrl accepts only http(s)", () => {
  assert.equal(isHttpUrl("https://instagram.com/p/abc"), true);
  assert.equal(isHttpUrl("http://example.com"), true);
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(isHttpUrl("ftp://example.com"), false);
  assert.equal(isHttpUrl("instagram.com/p/abc"), false);
});

test("inferPlatform detects platforms from provider text", () => {
  assert.equal(inferPlatform("Instagram Followers"), "Instagram");
  assert.equal(inferPlatform("TikTok Views [Fast]"), "TikTok");
  assert.equal(inferPlatform("YouTube Likes"), "YouTube");
  assert.equal(inferPlatform("X Followers"), "Twitter");
  assert.equal(inferPlatform("Twitter Retweets"), "Twitter");
  assert.equal(inferPlatform("Website Traffic from Google"), "Traffic");
  assert.equal(inferPlatform("Netflix"), "Other");
  assert.equal(inferPlatform("Xbox reviews"), "Other", "'x' only matches as a separate word");
});

test("every platform tab has an icon", () => {
  for (const platform of orderPlatforms) assert.ok(iconForPlatform(platform), platform);
});
