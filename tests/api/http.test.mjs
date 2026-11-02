// HTTP tests against the production build, without Supabase or provider credentials.
// They cover everything that must hold before any external service is reached.
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
  const env = { ...process.env, SUPABASE_URL: "", SUPABASE_ANON_KEY: "", SMM_PANEL_API_URL: "", SMM_PANEL_API_KEY: "", SMM_LIVE_ORDERS_ENABLED: "false" };
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
  assert.deepEqual(body.dependencies, { supabase: false, smmProvider: false, liveOrders: false });
  assert.doesNotMatch(JSON.stringify(body), /key|secret/i);
});

test("pages send security headers and no x-powered-by", async () => {
  const res = await fetch(`${base}/login`);
  assert.equal(res.status, 200);
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
