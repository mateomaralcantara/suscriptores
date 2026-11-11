import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../../lib/errors.ts";
import { orderCostMicros, usdToMicros } from "../../lib/money.ts";
import { orderServices } from "../../lib/order-services.ts";
import { createSeededStore, orderStatus, SANDBOX_COMPLETED_AFTER_MS, SANDBOX_PROCESSING_AFTER_MS, Store, toPublicUser } from "../../lib/store.ts";
import { parseOrderInput } from "../../lib/validation.ts";

const withRefill = orderServices.find((item) => item.refillDays > 0)!;
const withoutRefill = orderServices.find((item) => item.refillDays === 0)!;
const T0 = Date.parse("2026-01-01T00:00:00Z");

function setup(balanceUsd = 100) {
  const store = new Store();
  const user = toPublicUser(store.createUser({ email: "ana@example.com", name: "Ana", password: "Abcdefgh12" }));
  if (balanceUsd > 0) store.deposit(user.id, balanceUsd, "TEST", T0);
  return { store, user };
}

function input(service = withRefill, quantity = service.min) {
  return parseOrderInput({ serviceId: service.id, link: "https://example.com/p", quantity });
}

function rejects(fn: () => unknown, status: number, code: string) {
  assert.throws(fn, (error: unknown) => error instanceof ApiError && error.status === status && error.code === code);
}

test("placing an order debits exactly its cost and records it in the ledger", () => {
  const { store, user } = setup(100);
  const cost = orderCostMicros(withRefill.rate, withRefill.min);
  const { order, replayed } = store.placeOrder(user, input(), null, T0);
  assert.equal(replayed, false);
  assert.equal(order.status, "queued");
  assert.equal(order.costMicros, cost);
  assert.equal(store.balanceMicros(user.id), usdToMicros(100) - cost);
  const [latest] = store.listLedger(user);
  assert.deepEqual([latest.type, latest.amountMicros, latest.reference], ["order", -cost, order.id]);
});

test("an order that exceeds the balance is refused and changes nothing", () => {
  const { store, user } = setup(0);
  rejects(() => store.placeOrder(user, input(), null, T0), 402, "insufficient_funds");
  assert.equal(store.balanceMicros(user.id), 0);
  assert.equal(store.listOrders(user).length, 0);
  assert.equal(store.listLedger(user).length, 0);
});

test("the same idempotency key never charges twice", () => {
  const { store, user } = setup(100);
  const first = store.placeOrder(user, input(), "key-1", T0);
  const balance = store.balanceMicros(user.id);
  const second = store.placeOrder(user, input(), "key-1", T0 + 5);
  assert.equal(second.replayed, true);
  assert.equal(second.order.id, first.order.id);
  assert.equal(store.balanceMicros(user.id), balance);
  assert.equal(store.listOrders(user).length, 1);
});

test("reusing an idempotency key with a different order is a conflict", () => {
  const { store, user } = setup(100);
  store.placeOrder(user, input(), "key-1", T0);
  rejects(() => store.placeOrder(user, input(withRefill, withRefill.min + 1), "key-1", T0), 409, "idempotency_conflict");
});

test("idempotency keys are scoped per user", () => {
  const { store, user } = setup(100);
  const other = toPublicUser(store.createUser({ email: "leo@example.com", name: "Leo", password: "Abcdefgh12" }));
  store.deposit(other.id, 100, "TEST", T0);
  const mine = store.placeOrder(user, input(), "shared", T0);
  const theirs = store.placeOrder(other, input(), "shared", T0);
  assert.equal(theirs.replayed, false);
  assert.notEqual(mine.order.id, theirs.order.id);
});

test("a failed order does not consume its idempotency key", () => {
  const { store, user } = setup(0);
  rejects(() => store.placeOrder(user, input(), "key-1", T0), 402, "insufficient_funds");
  store.deposit(user.id, 10, "TEST", T0);
  assert.equal(store.placeOrder(user, input(), "key-1", T0).replayed, false);
});

test("sandbox orders advance queued → processing → completed with time", () => {
  const order = { createdAt: new Date(T0).toISOString(), canceledAt: null };
  assert.equal(orderStatus(order, T0), "queued");
  assert.equal(orderStatus(order, T0 + SANDBOX_PROCESSING_AFTER_MS), "processing");
  assert.equal(orderStatus(order, T0 + SANDBOX_COMPLETED_AFTER_MS), "completed");
  assert.equal(orderStatus({ ...order, canceledAt: order.createdAt }, T0 + SANDBOX_COMPLETED_AFTER_MS), "canceled");
});

test("canceling refunds the full cost exactly once", () => {
  const { store, user } = setup(100);
  const { order } = store.placeOrder(user, input(), null, T0);
  assert.equal(store.cancelOrder(user, order.id, T0 + 1000).status, "canceled");
  assert.equal(store.balanceMicros(user.id), usdToMicros(100));
  rejects(() => store.cancelOrder(user, order.id, T0 + 2000), 409, "already_canceled");
  assert.equal(store.balanceMicros(user.id), usdToMicros(100));
});

test("a completed order cannot be canceled", () => {
  const { store, user } = setup(100);
  const { order } = store.placeOrder(user, input(), null, T0);
  rejects(() => store.cancelOrder(user, order.id, T0 + SANDBOX_COMPLETED_AFTER_MS), 409, "not_cancelable");
});

test("users cannot read, cancel or refill orders they do not own", () => {
  const { store, user } = setup(100);
  const intruder = toPublicUser(store.createUser({ email: "eve@example.com", name: "Eve", password: "Abcdefgh12" }));
  const { order } = store.placeOrder(user, input(), null, T0);
  rejects(() => store.getOrder(intruder, order.id, T0), 404, "not_found");
  rejects(() => store.cancelOrder(intruder, order.id, T0), 404, "not_found");
  rejects(() => store.requestRefill(intruder, order.id, T0 + SANDBOX_COMPLETED_AFTER_MS), 404, "not_found");
  assert.equal(store.listOrders(intruder, T0).length, 0);
  assert.equal(store.listLedger(intruder).length, 0);
});

test("admins can see every order and the refund goes to the owner", () => {
  const { store, user } = setup(100);
  const admin = toPublicUser(store.createUser({ email: "root@example.com", name: "Root", password: "Abcdefgh12", role: "admin" }));
  const { order } = store.placeOrder(user, input(), null, T0);
  assert.equal(store.listOrders(admin, T0).length, 1);
  store.cancelOrder(admin, order.id, T0 + 1);
  assert.equal(store.balanceMicros(user.id), usdToMicros(100));
  assert.equal(store.balanceMicros(admin.id), 0);
});

test("refill is only for completed orders of services that offer it, inside the window, once", () => {
  const { store, user } = setup(100);
  const completedAt = T0 + SANDBOX_COMPLETED_AFTER_MS;
  const eligible = store.placeOrder(user, input(withRefill), null, T0).order;
  rejects(() => store.requestRefill(user, eligible.id, T0), 409, "refill_unavailable");
  const refill = store.requestRefill(user, eligible.id, completedAt);
  assert.equal(store.getRefill(user, refill.id).orderId, eligible.id);
  rejects(() => store.requestRefill(user, eligible.id, completedAt), 409, "refill_pending");

  const noRefill = store.placeOrder(user, input(withoutRefill), null, T0).order;
  rejects(() => store.requestRefill(user, noRefill.id, completedAt), 409, "refill_unavailable");

  const late = store.placeOrder(user, input(withRefill), null, T0).order;
  rejects(() => store.requestRefill(user, late.id, T0 + (withRefill.refillDays + 1) * 86_400_000), 409, "refill_expired");
});

test("the wallet balance always equals the sum of its ledger", () => {
  const { store, user } = setup(50);
  const a = store.placeOrder(user, input(), null, T0).order;
  store.placeOrder(user, input(withoutRefill), null, T0);
  store.cancelOrder(user, a.id, T0 + 1);
  store.deposit(user.id, 12.34, "TEST", T0 + 2);
  const sum = store.listLedger(user).reduce((total, entry) => total + entry.amountMicros, 0);
  assert.equal(sum, store.balanceMicros(user.id));
  assert.equal(store.listLedger(user)[0].balanceAfterMicros, store.balanceMicros(user.id));
});

test("accounts: duplicate emails are refused and credentials are checked", () => {
  const { store, user } = setup();
  rejects(() => store.createUser({ email: "ana@example.com", name: "Otra", password: "Abcdefgh12" }), 409, "email_taken");
  assert.equal(store.verifyCredentials("ana@example.com", "Abcdefgh12")?.id, user.id);
  assert.equal(store.verifyCredentials("ana@example.com", "wrong"), null);
  assert.equal(store.verifyCredentials("nobody@example.com", "Abcdefgh12"), null);
});

test("rotating an API key invalidates the previous one", () => {
  const { store, user } = setup();
  const first = store.rotateApiKey(user.id);
  assert.equal(store.findUserByApiKey(first)?.id, user.id);
  const second = store.rotateApiKey(user.id);
  assert.equal(store.findUserByApiKey(first), undefined);
  assert.equal(store.findUserByApiKey(second)?.id, user.id);
  assert.equal(store.findUserByApiKey("grl_unknown"), undefined);
});

test("demo accounts are seeded only in demo mode", () => {
  const previous = process.env.DEMO_MODE;
  try {
    process.env.DEMO_MODE = "true";
    assert.equal(createSeededStore().listUsers().length, 2);
    process.env.DEMO_MODE = "false";
    assert.equal(createSeededStore().listUsers().length, 0);
  } finally {
    if (previous === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = previous;
  }
});
