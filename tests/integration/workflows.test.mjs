// Static guard rails over the source tree: authentication, money-function grants and error hygiene.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const v1Routes = walk("app/api/v1").filter((file) => file.endsWith("route.ts"));
const sandboxOnly = new Set([path.join("app/api/v1/refills/[id]/route.ts")]);

test("every live /api/v1 route requires an authenticated user", () => {
  for (const file of v1Routes) {
    if (sandboxOnly.has(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /getUserFromRequest\(request\)/, `${file} must authenticate`);
    assert.match(source, /status: 401/, `${file} must answer 401`);
  }
});

test("server errors never echo internal messages with status 500", () => {
  for (const file of walk("app/api").filter((f) => f.endsWith(".ts"))) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /errorMessage\(error\)\s*}\s*,\s*{\s*status:\s*500/, `${file} leaks error details`);
  }
});

test("money functions are callable only by service_role", () => {
  const sql = fs.readdirSync("database/migrations").map((f) => fs.readFileSync(path.join("database/migrations", f), "utf8")).join("\n");
  const functions = [...sql.matchAll(/create or replace function public\.(\w+)\s*\(/g)]
    .map((m) => m[1])
    .filter((name) => !name.startsWith("handle_new_auth_user"));
  assert.ok(functions.length >= 6, "expected the order/wallet functions");
  for (const name of new Set(functions)) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon, authenticated`), `${name} must be revoked from clients`);
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to service_role`), `${name} must be granted to service_role`);
  }
});

test("security definer functions pin search_path", () => {
  for (const file of fs.readdirSync("database/migrations")) {
    const sql = fs.readFileSync(path.join("database/migrations", file), "utf8");
    const definers = sql.split("create or replace function").slice(1).filter((body) => body.includes("security definer"));
    for (const body of definers) assert.match(body, /set search_path = public/, `${file}: ${body.slice(0, 60)}`);
  }
});

test("admin access requires a confirmed email", () => {
  const source = fs.readFileSync("lib/supabase-server.ts", "utf8");
  assert.match(source, /email_confirmed_at/);
  assert.doesNotMatch(fs.readFileSync("app/(portal)/admin/layout.tsx", "utf8"), /isAdminEmail\(/);
});

test("every admin API route uses requireAdminApi", () => {
  for (const file of walk("app/api/admin").filter((f) => f.endsWith("route.ts"))) {
    assert.match(fs.readFileSync(file, "utf8"), /requireAdminApi\(request\)/, file);
  }
});

test("every admin page that reads data calls requireAdmin()", () => {
  for (const file of walk("app/(portal)/admin").filter((f) => f.endsWith("page.tsx"))) {
    const source = fs.readFileSync(file, "utf8");
    if (/serviceRoleRest|getSmm|listAll|AdminTransactionsTable/.test(source)) assert.match(source, /await requireAdmin\(\)/, file);
  }
});

test("ticket, payment and cron routes authenticate", () => {
  for (const file of walk("app/api/tickets").filter((f) => f.endsWith("route.ts"))) assert.match(fs.readFileSync(file, "utf8"), /getUserFromRequest\(request\)/, file);
  assert.match(fs.readFileSync("app/api/payments/checkout/route.ts", "utf8"), /getUserFromRequest\(request\)/);
  assert.match(fs.readFileSync("app/api/cron/sync-orders/route.ts", "utf8"), /isCronAuthorized/);
  assert.match(fs.readFileSync("app/api/webhooks/stripe/route.ts", "utf8"), /verifyStripeSignature/);
});

test("no page ships demo data", () => {
  assert.equal(fs.existsSync("lib/demo-data.ts"), false);
  for (const file of walk("app").filter((f) => f.endsWith(".tsx"))) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /demo-data|SandboxForm|sandbox_card/, file);
  }
});
