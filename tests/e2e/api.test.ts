/**
 * End-to-end tests against the real production build (`next start`).
 * Run `npm run build` first; `npm run validate` does it in the right order.
 */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { after, before, test } from "node:test";

const PORT = 4300 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = { origin: BASE };
const WEBHOOK_SECRET = "e2e-webhook-secret";
let server: ChildProcess;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function call(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    redirect: "manual",
    headers: { ...(init.body !== undefined ? { "content-type": "application/json" } : {}), ...init.headers },
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
  const text = await response.text();
  let json: Json = {};
  try {
    json = JSON.parse(text);
  } catch {
    // Not every response is JSON (pages, redirects).
  }
  return { status: response.status, headers: response.headers, json };
}

const sessions = new Map<string, string>();

/** Logs in once per account; later calls reuse the cookie so tests do not trip the login limiter. */
async function login(email: string, password: string): Promise<string> {
  const cached = sessions.get(email);
  if (cached) return cached;
  const cookie = await freshLogin(email, password);
  sessions.set(email, cookie);
  return cookie;
}

async function freshLogin(email: string, password: string): Promise<string> {
  const response = await call("/api/auth/login", { method: "POST", body: { email, password }, headers: ORIGIN });
  assert.equal(response.status, 200, JSON.stringify(response.json));
  return response.headers.getSetCookie()[0].split(";")[0];
}

async function apiKeyFor(cookie: string): Promise<Record<string, string>> {
  const response = await call("/api/auth/api-key", { method: "POST", headers: { cookie, ...ORIGIN } });
  assert.equal(response.status, 201);
  return { authorization: `Bearer ${response.json.apiKey}` };
}

before(async () => {
  assert.ok(existsSync(".next/BUILD_ID"), "Build the app first: npm run build");
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    env: { ...process.env, NODE_ENV: "production", DEMO_MODE: "true", SESSION_SECRET: "e2e-session-secret-0123456789-abcdefghij", WEBHOOK_SIGNING_SECRET: WEBHOOK_SECRET },
    stdio: "ignore",
  });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {
      // Server still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("The server did not start in time.");
});

after(() => {
  server?.kill();
});

test("health is public and responses carry security headers", async () => {
  const response = await call("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-powered-by"), null);
});

test("every private page redirects anonymous visitors to the login", async () => {
  for (const path of ["/dashboard", "/orders", "/orders/new", "/orders/ORD-000001", "/transactions", "/add-funds", "/services", "/tickets", "/settings", "/api-docs", "/admin", "/admin/users"]) {
    const response = await call(path);
    assert.equal(response.status, 307, path);
    assert.match(response.headers.get("location") ?? "", /\/login\?next=/, path);
  }
});

test("public pages stay reachable without a session", async () => {
  for (const path of ["/", "/login", "/register", "/terms", "/privacy", "/help"]) {
    assert.equal((await call(path)).status, 200, path);
  }
});

test("every account endpoint rejects anonymous requests", async () => {
  const endpoints: Array<[string, string]> = [
    ["GET", "/api/v1/balance"], ["GET", "/api/v1/orders"], ["POST", "/api/v1/orders"], ["POST", "/api/v1/orders/bulk"],
    ["GET", "/api/v1/orders/ORD-000001"], ["POST", "/api/v1/orders/ORD-000001/cancel"], ["POST", "/api/v1/orders/ORD-000001/refill"],
    ["GET", "/api/v1/refills/REF-000001"], ["GET", "/api/v1/transactions"], ["GET", "/api/auth/me"], ["POST", "/api/auth/api-key"],
    ["GET", "/api/payments"], ["POST", "/api/payments"], ["POST", "/api/webhooks/test"],
  ];
  for (const [method, path] of endpoints) {
    const response = await call(path, { method, body: method === "POST" ? {} : undefined, headers: ORIGIN });
    assert.equal(response.status, 401, `${method} ${path}`);
    assert.equal(response.json.success, false);
  }
});

test("forged session cookies and unknown API keys are rejected", async () => {
  assert.equal((await call("/api/v1/balance", { headers: { cookie: "grl_session=eyJ1aWQiOiJ4Iiwicm9sZSI6ImFkbWluIiwiZXhwIjo5OTk5OTk5OTk5fQ.AAAA" } })).status, 401);
  assert.equal((await call("/dashboard", { headers: { cookie: "grl_session=forged.token" } })).status, 307);
  assert.equal((await call("/api/v1/balance", { headers: { authorization: "Bearer grl_not_a_real_key" } })).status, 401);
});

test("login rejects bad credentials and sets a hardened cookie on success", async () => {
  const bad = await call("/api/auth/login", { method: "POST", body: { email: "admin@classroom.local", password: "wrong-password" }, headers: ORIGIN });
  assert.equal(bad.status, 401);
  assert.equal(bad.headers.getSetCookie().length, 0);

  const good = await call("/api/auth/login", { method: "POST", body: { email: "admin@classroom.local", password: "DemoAdmin123!" }, headers: ORIGIN });
  assert.equal(good.status, 200);
  const cookie = good.headers.getSetCookie()[0];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.equal(JSON.stringify(good.json).includes("passwordHash"), false);
});

test("cross-site requests cannot log in or mutate with the victim's cookie", async () => {
  const evil = { origin: "https://evil.example" };
  assert.equal((await call("/api/auth/login", { method: "POST", body: { email: "admin@classroom.local", password: "DemoAdmin123!" }, headers: evil })).status, 403);
  const cookie = await login("student@classroom.local", "DemoUser123!");
  const order = { serviceId: "SL5", link: "https://example.com/p", quantity: 100 };
  assert.equal((await call("/api/v1/orders", { method: "POST", body: order, headers: { cookie, ...evil } })).status, 403);
  assert.equal((await call("/api/v1/orders", { method: "POST", body: order, headers: { cookie } })).status, 403);
});

test("only admins reach the admin area", async () => {
  const client = await login("student@classroom.local", "DemoUser123!");
  const asClient = await call("/admin/users", { headers: { cookie: client } });
  assert.equal(asClient.status, 307);
  assert.match(asClient.headers.get("location") ?? "", /\/dashboard$/);
  assert.equal((await call("/dashboard", { headers: { cookie: client } })).status, 200);

  const admin = await login("admin@classroom.local", "DemoAdmin123!");
  assert.equal((await call("/admin/users", { headers: { cookie: admin } })).status, 200);
});

test("registration validates input, never grants admin, and refuses duplicates", async () => {
  const email = `e2e-${Date.now()}@example.com`;
  const weak = await call("/api/auth/register", { method: "POST", body: { email, name: "Nuevo", password: "short" }, headers: ORIGIN });
  assert.equal(weak.status, 422);

  const created = await call("/api/auth/register", { method: "POST", body: { email, name: "Nuevo", password: "Abcdefgh12", role: "admin" }, headers: ORIGIN });
  assert.equal(created.status, 201);
  assert.equal(created.json.user.role, "client");
  const cookie = created.headers.getSetCookie()[0].split(";")[0];
  assert.equal((await call("/admin", { headers: { cookie } })).status, 307);
  assert.equal((await call("/api/v1/balance", { headers: { cookie } })).json.available, 0);

  const duplicate = await call("/api/auth/register", { method: "POST", body: { email, name: "Otro", password: "Abcdefgh12" }, headers: ORIGIN });
  assert.equal(duplicate.status, 409);
});

test("order lifecycle through the API: charge, idempotent replay, cancel and refund", async () => {
  const auth = await apiKeyFor(await login("student@classroom.local", "DemoUser123!"));
  const before = (await call("/api/v1/balance", { headers: auth })).json.available as number;
  const body = { serviceId: "SL5", link: "https://example.com/campaign", quantity: 1000 };
  const headers = { ...auth, "idempotency-key": `e2e-${Date.now()}` };

  const created = await call("/api/v1/orders", { method: "POST", body, headers });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  assert.equal(created.json.data.cost, 0.197);
  assert.equal(created.json.data.status, "queued");
  const id = created.json.data.id as string;

  const replay = await call("/api/v1/orders", { method: "POST", body, headers });
  assert.equal(replay.status, 200);
  assert.equal(replay.json.replayed, true);
  assert.equal(replay.json.data.id, id);

  const conflict = await call("/api/v1/orders", { method: "POST", body: { ...body, quantity: 2000 }, headers });
  assert.equal(conflict.status, 409);

  const charged = (await call("/api/v1/balance", { headers: auth })).json.available as number;
  assert.equal(Math.round((before - charged) * 1e6), 197_000);
  assert.equal((await call(`/api/v1/orders/${id}`, { headers: auth })).json.data.id, id);
  assert.ok((await call("/api/v1/orders", { headers: auth })).json.data.some((order: Json) => order.id === id));

  const tooEarly = await call(`/api/v1/orders/${id}/refill`, { method: "POST", headers: auth });
  assert.equal(tooEarly.status, 409);

  const canceled = await call(`/api/v1/orders/${id}/cancel`, { method: "POST", headers: auth });
  assert.equal(canceled.status, 200);
  assert.equal(canceled.json.data.status, "canceled");
  assert.equal((await call(`/api/v1/orders/${id}/cancel`, { method: "POST", headers: auth })).status, 409);
  assert.equal((await call("/api/v1/balance", { headers: auth })).json.available, before);

  const ledger = (await call("/api/v1/transactions", { headers: auth })).json.data as Json[];
  assert.deepEqual(ledger.filter((entry) => entry.reference === id).map((entry) => entry.type).sort(), ["order", "refund"]);
});

test("invalid orders are rejected with details and never charged", async () => {
  const auth = await apiKeyFor(await login("student@classroom.local", "DemoUser123!"));
  const before = (await call("/api/v1/balance", { headers: auth })).json.available;
  const cases: Array<[unknown, number]> = [
    [{ serviceId: "nope", link: "https://example.com", quantity: 100 }, 422],
    [{ serviceId: "SL5", link: "javascript:alert(1)", quantity: 100 }, 422],
    [{ serviceId: "SL5", link: "https://example.com", quantity: 1 }, 422],
    [{ serviceId: "SL5", link: "https://example.com", quantity: "100" }, 422],
    [{ serviceId: "SL5", link: "https://example.com", quantity: 99_999_999 }, 422],
    ["{not json", 400],
    [[1, 2, 3], 400],
  ];
  for (const [body, status] of cases) {
    const response = await call("/api/v1/orders", { method: "POST", body, headers: { ...auth, "content-type": "application/json" } });
    assert.equal(response.status, status, JSON.stringify(body));
    assert.equal(response.json.success, false);
  }
  assert.equal((await call("/api/v1/balance", { headers: auth })).json.available, before);
});

test("an order larger than the balance is a 402", async () => {
  const email = `poor-${Date.now()}@example.com`;
  const created = await call("/api/auth/register", { method: "POST", body: { email, name: "Sin Saldo", password: "Abcdefgh12" }, headers: ORIGIN });
  const cookie = created.headers.getSetCookie()[0].split(";")[0];
  const response = await call("/api/v1/orders", { method: "POST", body: { serviceId: "SL5", link: "https://example.com", quantity: 100 }, headers: { cookie, ...ORIGIN } });
  assert.equal(response.status, 402);
  assert.equal(response.json.error.code, "insufficient_funds");
});

test("users cannot see or cancel each other's orders", async () => {
  const owner = await apiKeyFor(await login("student@classroom.local", "DemoUser123!"));
  const order = await call("/api/v1/orders", { method: "POST", body: { serviceId: "SL5", link: "https://example.com/x", quantity: 100 }, headers: owner });
  const id = order.json.data.id as string;

  const email = `other-${Date.now()}@example.com`;
  const created = await call("/api/auth/register", { method: "POST", body: { email, name: "Otro", password: "Abcdefgh12" }, headers: ORIGIN });
  const intruder = { cookie: created.headers.getSetCookie()[0].split(";")[0], ...ORIGIN };
  assert.equal((await call(`/api/v1/orders/${id}`, { headers: intruder })).status, 404);
  assert.equal((await call(`/api/v1/orders/${id}/cancel`, { method: "POST", headers: intruder })).status, 404);
  assert.equal((await call("/api/v1/orders", { headers: intruder })).json.total, 0);
  assert.equal((await call(`/orders/${id}`, { headers: intruder })).status, 404);
});

test("bulk orders are all-or-nothing", async () => {
  const auth = await apiKeyFor(await login("student@classroom.local", "DemoUser123!"));
  const before = (await call("/api/v1/balance", { headers: auth })).json.available as number;
  const good = { serviceId: "SL5", link: "https://example.com/a", quantity: 1000 };

  const mixed = await call("/api/v1/orders/bulk", { method: "POST", body: { orders: [good, { ...good, quantity: 1 }] }, headers: auth });
  assert.equal(mixed.status, 422);
  assert.equal(mixed.json.error.details[0].index, 1);
  assert.equal((await call("/api/v1/balance", { headers: auth })).json.available, before);

  assert.equal((await call("/api/v1/orders/bulk", { method: "POST", body: { orders: [] }, headers: auth })).status, 422);
  assert.equal((await call("/api/v1/orders/bulk", { method: "POST", body: { orders: Array(101).fill(good) }, headers: auth })).status, 422);

  const ok = await call("/api/v1/orders/bulk", { method: "POST", body: { orders: [good, good] }, headers: auth });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.accepted, 2);
  const after = (await call("/api/v1/balance", { headers: auth })).json.available as number;
  assert.equal(Math.round((before - after) * 1e6), 394_000);
});

test("sandbox deposits are validated and credited", async () => {
  const auth = await apiKeyFor(await login("student@classroom.local", "DemoUser123!"));
  const before = (await call("/api/v1/balance", { headers: auth })).json.available as number;
  for (const amount of [-50, 0, 1_000_000, "100", 1.999]) {
    assert.equal((await call("/api/payments", { method: "POST", body: { amount }, headers: auth })).status, 422, String(amount));
  }
  const ok = await call("/api/payments", { method: "POST", body: { amount: 25.5 }, headers: auth });
  assert.equal(ok.status, 201);
  const after = (await call("/api/v1/balance", { headers: auth })).json.available as number;
  assert.equal(Math.round((after - before) * 100), 2550);
});

test("the test webhook is signed with a verifiable HMAC", async () => {
  const auth = await apiKeyFor(await login("student@classroom.local", "DemoUser123!"));
  const response = await call("/api/webhooks/test", { method: "POST", body: { orderId: "ORD-1" }, headers: auth });
  assert.equal(response.status, 200);
  const timestamp = response.json.headers["x-growth-timestamp"];
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${response.json.body}`).digest("hex");
  assert.equal(response.json.headers["x-growth-signature"], `sha256=${expected}`);
});

test("logout clears the session cookie", async () => {
  const cookie = await login("student@classroom.local", "DemoUser123!");
  const response = await call("/api/auth/logout", { method: "POST", headers: { cookie, ...ORIGIN } });
  assert.equal(response.status, 200);
  assert.match(response.headers.getSetCookie()[0], /Max-Age=0/);
});

test("the service catalog is public and complete", async () => {
  const response = await call("/api/v1/services");
  assert.equal(response.status, 200);
  assert.equal(response.json.count, response.json.services.length);
  assert.ok(response.json.count > 0);
});

test("repeated failed logins are rate limited", async () => {
  const body = { email: "ratelimit@example.com", password: "wrong-password" };
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    statuses.push((await call("/api/auth/login", { method: "POST", body, headers: ORIGIN })).status);
  }
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
  assert.deepEqual(statuses.slice(10), [429, 429]);
});
