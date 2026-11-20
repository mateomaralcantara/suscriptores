// Pruebas HTTP contra el build de producción (requiere `npm run build`).
// Sin Supabase configurado: verifica protección de rutas, cabeceras y errores controlados.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 3911;
const BASE = `http://127.0.0.1:${PORT}`;
let server;

before(async () => {
  const env = { ...process.env, PORT: String(PORT), SUPABASE_URL: "", SUPABASE_ANON_KEY: "", NODE_ENV: "production" };
  server = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], { env, stdio: "ignore" });
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("El servidor no arrancó");
});

after(() => server?.kill());

test("health responde y declara la fase", async () => {
  const body = await (await fetch(`${BASE}/api/health`)).json();
  assert.equal(body.ok, true);
  assert.equal(body.phase, 1);
  assert.equal(body.database, "no_configurada");
});

test("cabeceras de seguridad", async () => {
  const res = await fetch(`${BASE}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal(res.headers.get("x-powered-by"), null);
});

for (const page of ["/inicio", "/proyectos", "/proyectos/nuevo", "/administracion", "/muestras", "/modulos/encuestas"]) {
  test(`sin sesión ${page} redirige a /login`, async () => {
    const res = await fetch(`${BASE}${page}`, { redirect: "manual" });
    assert.ok([302, 307].includes(res.status), String(res.status));
    assert.match(res.headers.get("location") ?? "", /\/login\?next=/);
  });
}

for (const [method, path] of [["GET", "/api/v1/organizations"], ["GET", "/api/v1/projects?organization=x"], ["POST", "/api/v1/projects"], ["POST", "/api/v1/methodology/simulate"]]) {
  test(`sin sesión ${method} ${path} → 401 JSON`, async () => {
    const res = await fetch(`${BASE}${path}`, { method, headers: { "content-type": "application/json" }, body: method === "GET" ? undefined : "{}" });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).ok, false);
  });
}

test("token inventado no da acceso (servicio no configurado → 503 controlado)", async () => {
  const res = await fetch(`${BASE}/api/v1/organizations`, { headers: { authorization: "Bearer inventado" } });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.error, "El servicio de datos no está configurado.");
});

test("login desde otro origen se rechaza", async () => {
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { origin: "https://atacante.example", "content-type": "application/json" }, body: "{}" });
  assert.equal(res.status, 403);
});

test("login sin datos → 400; sin configuración → 503", async () => {
  assert.equal((await fetch(`${BASE}/api/auth/login`, { method: "POST", body: "{}" })).status, 400);
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", body: JSON.stringify({ email: "a@b.test", password: "x" }) });
  assert.equal(res.status, 503);
});

test("registro valida antes de llamar al proveedor", async () => {
  const res = await fetch(`${BASE}/api/auth/register`, { method: "POST", body: JSON.stringify({ name: "A", email: "malo", password: "corta" }) });
  assert.equal(res.status, 400);
});

test("página de login avisa si falta configuración", async () => {
  const html = await (await fetch(`${BASE}/login`)).text();
  assert.match(html, /Servicio no configurado/);
});
