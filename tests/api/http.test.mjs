// HTTP tests against the production build, without Supabase or provider credentials.
// They cover everything that must hold before any external service is reached.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import { signStripePayload } from "../../lib/stripe-signature.ts";

const WEBHOOK_SECRET = "whsec_http_test_secret";
const CRON_SECRET = "cron-secret-for-http-tests";

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
  const env = { ...process.env, SUPABASE_URL: "", SUPABASE_ANON_KEY: "", SMM_PANEL_API_URL: "", SMM_PANEL_API_KEY: "", SMM_LIVE_ORDERS_ENABLED: "false", STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET, CRON_SECRET };
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"], { stdio: "ignore", env });
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

test("health reports dependency configuration without secrets", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.dependencies, { supabase: false, smmProvider: false, smmProviders: 0, liveOrders: false });
  assert.doesNotMatch(JSON.stringify(body), /key|secret/i);
});

test("pages send security headers and no x-powered-by", async () => {
  const res = await fetch(`${base}/login`);
  assert.equal(res.status, 200);
  const csp = res.headers.get("content-security-policy") ?? "";
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /unsafe-eval/, "no unsafe-eval in production");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("portal pages redirect anonymous visitors to /login", async () => {
  for (const path of ["/dashboard", "/orders", "/orders/new", "/admin", "/admin/providers", "/transactions"]) {
    const res = await fetch(`${base}${path}`, { redirect: "manual" });
    assert.ok([307, 308].includes(res.status), `${path} -> ${res.status}`);
    const location = new URL(res.headers.get("location"), base);
    assert.equal(location.pathname, "/login", path);
    assert.equal(location.searchParams.get("next"), path);
  }
});

test("every /api/v1 endpoint answers 401 without a session", async () => {
  const calls = [
    ["GET", "/api/v1/services"], ["GET", "/api/v1/orders"], ["POST", "/api/v1/orders"], ["POST", "/api/v1/orders/bulk"],
    ["GET", "/api/v1/orders/ORD-1"], ["POST", "/api/v1/orders/ORD-1/cancel"], ["POST", "/api/v1/orders/ORD-1/refill"],
    ["GET", "/api/v1/balance"], ["GET", "/api/v1/transactions"], ["GET", "/api/auth/me"],
    ["POST", "/api/payments/checkout"], ["GET", "/api/tickets"], ["POST", "/api/tickets"],
    ["POST", "/api/admin/wallets/adjust"], ["POST", "/api/admin/orders/x/resolve"],
  ];
  for (const [method, path] of calls) {
    const res = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json" }, body: method === "POST" ? "{}" : undefined });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test("a forged bearer token is rejected", async () => {
  const res = await fetch(`${base}/api/v1/balance`, { headers: { authorization: "Bearer forged.token.value" } });
  assert.equal(res.status, 401);
});

test("auth endpoints validate input before contacting Supabase", async () => {
  assert.equal((await post("/api/auth/login", { email: "", password: "" })).status, 400);
  assert.equal((await post("/api/auth/register", { name: "A", email: "a@b.com", password: "short" })).status, 400);
  assert.equal((await post("/api/auth/forgot-password", { email: "" })).status, 400);
});

test("logout clears the session cookies", async () => {
  const res = await post("/api/auth/logout", {});
  assert.equal(res.status, 200);
  const cookies = res.headers.getSetCookie().join("\n");
  assert.match(cookies, /gr_access_token=;/);
  assert.match(cookies, /gr_refresh_token=;/);
});

test("an invalid refresh token sends pages to /login and clears the cookies", async () => {
  const res = await fetch(`${base}/dashboard`, { redirect: "manual", headers: { cookie: "gr_refresh_token=invalid" } });
  assert.ok([307, 308].includes(res.status));
  assert.match(res.headers.getSetCookie().join("\n"), /gr_refresh_token=;/);
});

test("login is rate limited per email", async () => {
  const email = `rate-${Date.now()}@example.com`;
  const statuses = [];
  for (let i = 0; i < 9; i += 1) statuses.push((await post("/api/auth/login", { email, password: "wrong-password" })).status);
  assert.deepEqual(statuses.slice(0, 8), Array(8).fill(401));
  assert.equal(statuses[8], 429);
});

test("payments report Stripe as not configured", async () => {
  const body = await (await fetch(`${base}/api/payments`)).json();
  assert.equal(body.enabled, false);
  assert.equal(body.min, 5);
});

test("stripe webhook rejects bad signatures and ignores unrelated events", async () => {
  const payload = JSON.stringify({ id: "evt_1", type: "customer.created", data: { object: {} } });
  const bad = await fetch(`${base}/api/webhooks/stripe`, { method: "POST", body: payload, headers: { "stripe-signature": "t=1,v1=bad" } });
  assert.equal(bad.status, 400);
  const tampered = await fetch(`${base}/api/webhooks/stripe`, {
    method: "POST",
    body: payload.replace("evt_1", "evt_2"),
    headers: { "stripe-signature": signStripePayload(payload, WEBHOOK_SECRET, Math.floor(Date.now() / 1000)) },
  });
  assert.equal(tampered.status, 400);
  const good = await fetch(`${base}/api/webhooks/stripe`, {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": signStripePayload(payload, WEBHOOK_SECRET, Math.floor(Date.now() / 1000)) },
  });
  assert.equal(good.status, 200);
  assert.equal((await good.json()).ignored, true);
});

test("stripe webhook leaves unpaid checkouts pending", async () => {
  const payload = JSON.stringify({
    id: "evt_3",
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", payment_status: "unpaid", amount_total: 1000, currency: "usd", client_reference_id: "p", metadata: { purpose: "wallet_topup" } } },
  });
  const res = await fetch(`${base}/api/webhooks/stripe`, {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": signStripePayload(payload, WEBHOOK_SECRET, Math.floor(Date.now() / 1000)) },
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).pending, true);
});

test("cron endpoint requires the secret", async () => {
  assert.equal((await fetch(`${base}/api/cron/sync-orders`)).status, 401);
  assert.equal((await fetch(`${base}/api/cron/sync-orders`, { headers: { authorization: "Bearer nope" } })).status, 401);
  const ok = await fetch(`${base}/api/cron/sync-orders`, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  assert.equal(ok.status, 500, "authorized, then fails generically because Supabase is not configured");
  assert.doesNotMatch(await ok.text(), /Supabase/);
});

test("reseller API v2 rejects missing, malformed and unknown keys", async () => {
  const form = (body) => fetch(`${base}/api/v2`, { method: "POST", body: new URLSearchParams(body) });
  const missing = await form({ action: "balance" });
  assert.equal(missing.status, 401);
  assert.deepEqual(await missing.json(), { error: "Invalid API key" });
  assert.equal((await form({ key: "abc", action: "balance" })).status, 401);
  const unknownKey = `gr_${"a".repeat(12)}_${"b".repeat(43)}`;
  const unknown = await fetch(`${base}/api/v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: unknownKey, action: "balance" }) });
  assert.equal(unknown.status, 500, "well-formed key reaches the database lookup, which fails generically without Supabase");
  assert.doesNotMatch(await unknown.text(), /Supabase/);
  assert.equal((await fetch(`${base}/api/v2`)).status, 200, "GET answers with a usage hint");
});

test("account API keys require a session", async () => {
  assert.equal((await fetch(`${base}/api/account/api-keys`)).status, 401);
  assert.equal((await post("/api/account/api-keys", { name: "x" })).status, 401);
});
