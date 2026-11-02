// End-to-end HTTP tests against the production build. Run after `npm run build`.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";

if (!fs.existsSync(".next/BUILD_ID")) throw new Error("No hay build. Ejecuta `npm run build` antes de `npm run test:api`.");

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer().once("error", reject).listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

let server;
let base;

before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore" });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("El servidor no arrancó a tiempo.");
});

after(() => server?.kill());

const post = (path, body) =>
  fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("GET /api/health", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-growth-mode"), "sandbox");
  assert.equal((await res.json()).ok, true);
});

test("pages send security headers", async () => {
  const res = await fetch(`${base}/orders/new`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("GET /api/v1/services exposes the order catalog", async () => {
  const body = await (await fetch(`${base}/api/v1/services`)).json();
  assert.equal(body.count, body.services.length);
  assert.ok(body.services.some((service) => service.id === "SL5"));
});

test("POST /api/v1/orders creates a valid order with server-side pricing", async () => {
  const res = await post("/api/v1/orders", { serviceId: "SL5", link: "https://example.com/p", quantity: 1000, charge: 0 });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.charge, 0.197);
  assert.equal(body.status, "queued");
  assert.match(body.orderId, /^ORD-DEMO-/);
});

test("POST /api/v1/orders echoes the Idempotency-Key header", async () => {
  const res = await fetch(`${base}/api/v1/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "abc-123" },
    body: JSON.stringify({ serviceId: "SL5", link: "https://example.com/p", quantity: 30 }),
  });
  assert.equal((await res.json()).idempotencyKey, "abc-123");
});

test("POST /api/v1/orders rejects malformed JSON with 400", async () => {
  assert.equal((await post("/api/v1/orders", "{nope")).status, 400);
  assert.equal((await post("/api/v1/orders", "[]")).status, 400);
});

test("POST /api/v1/orders rejects invalid fields with 422 and details", async () => {
  const res = await post("/api/v1/orders", { serviceId: "SL5", link: "javascript:alert(1)", quantity: 1 });
  assert.equal(res.status, 422);
  const { details } = await res.json();
  assert.ok(details.link);
  assert.ok(details.quantity);
});

test("POST /api/v1/orders/bulk splits accepted and rejected entries", async () => {
  const res = await post("/api/v1/orders/bulk", { orders: [{ serviceId: "SL5", link: "https://a.com", quantity: 30 }, { serviceId: "NOPE" }] });
  assert.equal(res.status, 202);
  const body = await res.json();
  assert.equal(body.accepted, 1);
  assert.equal(body.rejected, 1);
  assert.equal(body.errors[0].index, 1);
});

test("POST /api/v1/orders/bulk rejects empty or malformed batches", async () => {
  assert.equal((await post("/api/v1/orders/bulk", { orders: [] })).status, 422);
  assert.equal((await post("/api/v1/orders/bulk", { orders: "x" })).status, 400);
  assert.equal((await post("/api/v1/orders/bulk", { orders: [{}] })).status, 422);
});

test("GET /api/v1/orders/:id returns 404 for unknown orders", async () => {
  assert.equal((await fetch(`${base}/api/v1/orders/ORD-000001`)).status, 200);
  assert.equal((await fetch(`${base}/api/v1/orders/ORD-999999`)).status, 404);
});

test("cancel and refill respect the order status", async () => {
  // demo data: ORD-000001 completed, ORD-000002 processing
  assert.equal((await post("/api/v1/orders/ORD-000002/cancel", {})).status, 202);
  assert.equal((await post("/api/v1/orders/ORD-000001/cancel", {})).status, 409);
  assert.equal((await post("/api/v1/orders/ORD-000001/refill", {})).status, 202);
  assert.equal((await post("/api/v1/orders/ORD-000002/refill", {})).status, 409);
  assert.equal((await post("/api/v1/orders/ORD-999999/cancel", {})).status, 404);
});

test("POST /api/payments validates the amount", async () => {
  assert.equal((await post("/api/payments", { amount: 50 })).status, 201);
  assert.equal((await post("/api/payments", { amount: -1 })).status, 422);
  assert.equal((await post("/api/payments", { amount: "abc" })).status, 422);
});

test("detail pages return 404 for unknown ids", async () => {
  assert.equal((await fetch(`${base}/orders/ORD-999999`)).status, 404);
  assert.equal((await fetch(`${base}/tickets/TKT-9999`)).status, 404);
  assert.equal((await fetch(`${base}/orders/ORD-000001`)).status, 200);
});
