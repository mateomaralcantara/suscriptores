import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const pages = [
  "dashboard", "services", "orders", "orders/new", "orders/bulk", "tickets", "tickets/new",
  "transactions", "add-funds", "affiliates", "child-panels", "api-docs", "settings", "admin",
];
const apiRoutes = [
  "health", "payments", "v1/services", "v1/orders", "v1/orders/bulk", "v1/balance", "v1/transactions",
  "v1/orders/[id]", "v1/orders/[id]/cancel", "v1/orders/[id]/refill", "v1/refills/[id]", "webhooks/test",
];

for (const page of pages) {
  test(`page exists: /${page}`, () => assert.ok(fs.existsSync(`app/(portal)/${page}/page.tsx`)));
}
for (const route of apiRoutes) {
  test(`api route exists: /api/${route}`, () => assert.ok(fs.existsSync(`app/api/${route}/route.ts`)));
}
