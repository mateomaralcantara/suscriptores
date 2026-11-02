import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const protectedSections = ["dashboard", "admin", "orders", "services", "tickets", "transactions", "settings", "add-funds"];
const pages = [...protectedSections, "orders/new", "orders/bulk", "tickets/new", "affiliates", "child-panels", "api-docs", "notifications"];
const apiRoutes = [
  "health", "auth/login", "auth/logout", "auth/me", "auth/register", "auth/forgot-password",
  "v1/services", "v1/orders", "v1/orders/bulk", "v1/orders/[id]", "v1/orders/[id]/cancel", "v1/orders/[id]/refill",
  "v1/balance", "v1/transactions",
];

for (const page of pages) {
  test(`page exists: /${page}`, () => assert.ok(fs.existsSync(`app/(portal)/${page}/page.tsx`)));
}
for (const route of apiRoutes) {
  test(`api route exists: /api/${route}`, () => assert.ok(fs.existsSync(`app/api/${route}/route.ts`)));
}

test("proxy protects every portal section", () => {
  const proxy = fs.readFileSync("proxy.ts", "utf8");
  for (const section of protectedSections) assert.ok(proxy.includes(`"/${section}/:path*"`), section);
});
