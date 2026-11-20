import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const pages = ["inicio", "proyectos", "proyectos/nuevo", "proyectos/[id]", "proyectos/[id]/editar", "muestras", "administracion", "configuracion", "organizacion/nueva", "modulos/[slug]"];
const api = [
  "health", "auth/login", "auth/register", "auth/logout", "auth/forgot-password", "session/organization",
  "v1/organizations", "v1/organizations/[id]/members", "v1/organizations/[id]/members/[userId]", "v1/organizations/[id]/audit",
  "v1/projects", "v1/projects/[id]", "v1/projects/[id]/status", "v1/projects/[id]/members", "v1/methodology/simulate", "v1/geo",
];

for (const p of pages) test(`página: /${p}`, () => assert.ok(exists(`app/(portal)/${p}/page.tsx`)));
for (const r of api) test(`API: /api/${r}`, () => assert.ok(exists(`app/api/${r}/route.ts`)));

test("proxy protege todas las secciones del portal y la API", () => {
  const proxy = read("proxy.ts");
  for (const dir of fs.readdirSync(path.join(root, "app/(portal)"), { withFileTypes: true }).filter((d) => d.isDirectory())) {
    assert.ok(proxy.includes(`"/${dir.name}/:path*"`), dir.name);
  }
  assert.ok(proxy.includes('"/api/v1/:path*"'));
});

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

test("ninguna ruta ni página usa la service role (la RLS decide el acceso)", () => {
  for (const file of [...walk(path.join(root, "app")), ...walk(path.join(root, "lib")), ...walk(path.join(root, "components"))]) {
    assert.ok(!fs.readFileSync(file, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY"), file);
  }
});

test("las rutas que cambian estado comprueban el origen", () => {
  for (const file of walk(path.join(root, "app/api")).filter((f) => f.endsWith("route.ts"))) {
    const src = fs.readFileSync(file, "utf8");
    if (/export async function (POST|PATCH|DELETE)/.test(src) && !file.includes("logout") && !file.includes("methodology")) {
      assert.ok(src.includes("sameOrigin(request)"), file);
    }
  }
});

test("los componentes cliente no importan módulos de servidor", () => {
  for (const file of walk(path.join(root, "components"))) {
    const src = fs.readFileSync(file, "utf8");
    if (src.startsWith('"use client"')) {
      assert.ok(!/lib\/(session|data|supabase)"/.test(src), file);
    }
  }
});

test("todas las tablas de las migraciones tienen RLS", () => {
  const sql = fs.readdirSync(path.join(root, "database/migrations")).map((f) => read(`database/migrations/${f}`)).join("\n");
  const tables = [...sql.matchAll(/create table if not exists public\.([a-z_]+)/g)].map((m) => m[1]);
  assert.ok(tables.length >= 13);
  for (const t of tables) assert.ok(sql.includes(`alter table public.${t} enable row level security`), t);
});
