import assert from "node:assert/strict";
import test from "node:test";
import { generateApiKey, hashApiKey, hashPassword, passwordProblems, verifyPassword } from "../../lib/auth/password.ts";
import { readCookie, signSession, verifySession } from "../../lib/auth/session.ts";
import { RateLimiter } from "../../lib/rate-limit.ts";

const SECRET = "unit-test-secret-with-enough-length-0001";
const future = () => Math.floor(Date.now() / 1000) + 3600;

test("a signed session round-trips its payload", async () => {
  const payload = { uid: "user-1", role: "admin" as const, exp: future() };
  assert.deepEqual(await verifySession(await signSession(payload, SECRET), SECRET), payload);
});

test("a session signed with another secret is rejected", async () => {
  const token = await signSession({ uid: "user-1", role: "client", exp: future() }, SECRET);
  assert.equal(await verifySession(token, "another-secret-with-enough-length-0002"), null);
});

test("tampering with the payload (role escalation) invalidates the session", async () => {
  const token = await signSession({ uid: "user-1", role: "client", exp: future() }, SECRET);
  const forgedBody = Buffer.from(JSON.stringify({ uid: "user-1", role: "admin", exp: future() })).toString("base64url");
  assert.equal(await verifySession(`${forgedBody}.${token.split(".")[1]}`, SECRET), null);
});

test("an expired session is rejected", async () => {
  const exp = Math.floor(Date.now() / 1000) + 60;
  const token = await signSession({ uid: "user-1", role: "client", exp }, SECRET);
  assert.notEqual(await verifySession(token, SECRET), null);
  assert.equal(await verifySession(token, SECRET, (exp + 1) * 1000), null);
});

test("malformed tokens are rejected without throwing", async () => {
  for (const token of ["", "abc", "a.b.c", "!!.??", ".", undefined, null]) {
    assert.equal(await verifySession(token, SECRET), null);
  }
});

test("readCookie finds the named cookie only", () => {
  assert.equal(readCookie("a=1; grl_session=tok.en; b=2", "grl_session"), "tok.en");
  assert.equal(readCookie("xgrl_session=bad", "grl_session"), undefined);
  assert.equal(readCookie(null, "grl_session"), undefined);
});

test("password hashes verify only the original password and are salted", () => {
  const hash = hashPassword("Correct-Horse-9");
  assert.equal(verifyPassword("Correct-Horse-9", hash), true);
  assert.equal(verifyPassword("correct-horse-9", hash), false);
  assert.notEqual(hash, hashPassword("Correct-Horse-9"));
  assert.equal(hash.includes("Correct-Horse-9"), false);
});

test("verifyPassword rejects malformed stored hashes", () => {
  assert.equal(verifyPassword("x", "plaintext"), false);
  assert.equal(verifyPassword("x", "scrypt$00$00"), false);
});

test("password policy requires length, letters and digits", () => {
  assert.deepEqual(passwordProblems("Abcdefgh12"), []);
  assert.equal(passwordProblems("short1").length, 1);
  assert.equal(passwordProblems("onlylettersss").length, 1);
  assert.equal(passwordProblems(12345).length, 1);
});

test("API keys are unique and hashed deterministically", () => {
  const key = generateApiKey();
  assert.match(key, /^grl_[0-9a-f]{48}$/);
  assert.notEqual(key, generateApiKey());
  assert.equal(hashApiKey(key), hashApiKey(key));
  assert.notEqual(hashApiKey(key), key);
});

test("rate limiter blocks after the limit and recovers when the window ends", () => {
  const limiter = new RateLimiter(2, 1000);
  assert.equal(limiter.check("k", 0).allowed, true);
  assert.equal(limiter.check("k", 10).allowed, true);
  const blocked = limiter.check("k", 20);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 1);
  assert.equal(limiter.check("other", 20).allowed, true);
  assert.equal(limiter.check("k", 1000).allowed, true);
});
