import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("smoke route dashboard", () => assert.equal(fs.existsSync("app/(portal)/dashboard/page.tsx"), true));
test("smoke route services", () => assert.equal(fs.existsSync("app/(portal)/services/page.tsx"), true));
test("smoke route orders", () => assert.equal(fs.existsSync("app/(portal)/orders/page.tsx"), true));
test("smoke route tickets", () => assert.equal(fs.existsSync("app/(portal)/tickets/page.tsx"), true));
test("smoke route admin", () => assert.equal(fs.existsSync("app/(portal)/admin/page.tsx"), true));