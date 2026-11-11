import { randomUUID } from "node:crypto";
import { ApiError } from "./errors.ts";
import { generateApiKey, hashApiKey, hashPassword, verifyPassword } from "./auth/password.ts";
import type { Role } from "./auth/session.ts";
import { isDemoMode } from "./config.ts";
import { orderCostMicros, usdToMicros } from "./money.ts";
import type { OrderInput } from "./validation.ts";

/**
 * In-memory data store with the business rules of the panel:
 * wallets, orders, idempotency, cancellations, refills and the ledger.
 *
 * It lives in a single process, so data resets on restart. A PostgreSQL adapter
 * implementing the same methods (see database/migrations) is what production needs.
 */

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  apiKeyHash: string | null;
  createdAt: string;
};

export type PublicUser = Pick<User, "id" | "email" | "name" | "role">;

export type OrderStatus = "queued" | "processing" | "completed" | "canceled";

export type StoredOrder = {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  refillDays: number;
  link: string;
  quantity: number;
  costMicros: number;
  createdAt: string;
  canceledAt: string | null;
};

export type OrderView = StoredOrder & { status: OrderStatus };

export type LedgerEntry = {
  id: string;
  userId: string;
  type: "deposit" | "order" | "refund";
  /** Signed amount: positive credits the wallet, negative debits it. */
  amountMicros: number;
  balanceAfterMicros: number;
  reference: string;
  createdAt: string;
};

export type Refill = { id: string; orderId: string; userId: string; status: "pending"; createdAt: string };

/** Sandbox lifecycle: there is no real provider, so progress is a pure function of time. */
export const SANDBOX_PROCESSING_AFTER_MS = 30_000;
export const SANDBOX_COMPLETED_AFTER_MS = 120_000;

export function orderStatus(order: Pick<StoredOrder, "createdAt" | "canceledAt">, nowMs: number): OrderStatus {
  if (order.canceledAt) return "canceled";
  const age = nowMs - Date.parse(order.createdAt);
  if (age >= SANDBOX_COMPLETED_AFTER_MS) return "completed";
  if (age >= SANDBOX_PROCESSING_AFTER_MS) return "processing";
  return "queued";
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

// Verified against when the email is unknown, so both paths cost the same time.
let dummyHash: string | undefined;

export class Store {
  private users = new Map<string, User>();
  private userIdByEmail = new Map<string, string>();
  private userIdByApiKeyHash = new Map<string, string>();
  private balances = new Map<string, number>();
  private orders = new Map<string, StoredOrder>();
  private ledger: LedgerEntry[] = [];
  private refills = new Map<string, Refill>();
  private idempotency = new Map<string, { fingerprint: string; orderId: string }>();
  private sequence = 0;

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${String(this.sequence).padStart(6, "0")}`;
  }

  // ── Users ────────────────────────────────────────────────────────────────

  createUser(input: { email: string; name: string; password: string; role?: Role }): User {
    if (this.userIdByEmail.has(input.email)) {
      throw new ApiError(409, "email_taken", "Ya existe una cuenta con ese correo.");
    }
    const user: User = {
      id: randomUUID(),
      email: input.email,
      name: input.name,
      role: input.role ?? "client",
      passwordHash: hashPassword(input.password),
      apiKeyHash: null,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    this.userIdByEmail.set(user.email, user.id);
    this.balances.set(user.id, 0);
    return user;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  listUsers(): User[] {
    return [...this.users.values()];
  }

  verifyCredentials(email: string, password: string): User | null {
    const id = this.userIdByEmail.get(email);
    const user = id ? this.users.get(id) : undefined;
    if (!user) {
      dummyHash ??= hashPassword("unknown-user-placeholder");
      verifyPassword(password, dummyHash);
      return null;
    }
    return verifyPassword(password, user.passwordHash) ? user : null;
  }

  /** Replaces the user's API key and returns the new one; it cannot be read again later. */
  rotateApiKey(userId: string): string {
    const user = this.users.get(userId);
    if (!user) throw new ApiError(404, "not_found", "Usuario no encontrado.");
    if (user.apiKeyHash) this.userIdByApiKeyHash.delete(user.apiKeyHash);
    const key = generateApiKey();
    user.apiKeyHash = hashApiKey(key);
    this.userIdByApiKeyHash.set(user.apiKeyHash, user.id);
    return key;
  }

  findUserByApiKey(key: string): User | undefined {
    const id = this.userIdByApiKeyHash.get(hashApiKey(key));
    return id ? this.users.get(id) : undefined;
  }

  // ── Wallet ───────────────────────────────────────────────────────────────

  balanceMicros(userId: string): number {
    return this.balances.get(userId) ?? 0;
  }

  private post(userId: string, type: LedgerEntry["type"], amountMicros: number, reference: string, nowMs: number): LedgerEntry {
    const balanceAfterMicros = this.balanceMicros(userId) + amountMicros;
    if (balanceAfterMicros < 0) throw new ApiError(402, "insufficient_funds", "Saldo insuficiente para completar la operación.");
    this.balances.set(userId, balanceAfterMicros);
    const entry: LedgerEntry = {
      id: this.nextId("TX"),
      userId,
      type,
      amountMicros,
      balanceAfterMicros,
      reference,
      createdAt: new Date(nowMs).toISOString(),
    };
    this.ledger.push(entry);
    return entry;
  }

  deposit(userId: string, amountUsd: number, reference: string, nowMs: number = Date.now()): LedgerEntry {
    if (!this.users.has(userId)) throw new ApiError(404, "not_found", "Usuario no encontrado.");
    if (!(amountUsd > 0)) throw new ApiError(422, "validation_failed", "El monto debe ser positivo.");
    return this.post(userId, "deposit", usdToMicros(amountUsd), reference, nowMs);
  }

  listLedger(user: PublicUser): LedgerEntry[] {
    const entries = user.role === "admin" ? this.ledger : this.ledger.filter((entry) => entry.userId === user.id);
    return [...entries].reverse();
  }

  // ── Orders ───────────────────────────────────────────────────────────────

  /**
   * Debits the wallet and creates the order atomically.
   * Repeating a request with the same idempotency key returns the original order
   * instead of charging twice; reusing a key with a different payload is rejected.
   */
  placeOrder(user: PublicUser, input: OrderInput, idempotencyKey: string | null, nowMs: number = Date.now()): { order: OrderView; replayed: boolean } {
    const fingerprint = `${input.service.id}|${input.link}|${input.quantity}`;
    const idempotencyId = idempotencyKey ? `${user.id}:${idempotencyKey}` : null;
    if (idempotencyId) {
      const previous = this.idempotency.get(idempotencyId);
      if (previous) {
        if (previous.fingerprint !== fingerprint) {
          throw new ApiError(409, "idempotency_conflict", "La Idempotency-Key ya se usó con un pedido distinto.");
        }
        return { order: this.view(this.orders.get(previous.orderId)!, nowMs), replayed: true };
      }
    }

    const costMicros = orderCostMicros(input.service.rate, input.quantity);
    const id = this.nextId("ORD");
    this.post(user.id, "order", -costMicros, id, nowMs);
    const order: StoredOrder = {
      id,
      userId: user.id,
      serviceId: input.service.id,
      serviceName: input.service.name,
      refillDays: input.service.refillDays,
      link: input.link,
      quantity: input.quantity,
      costMicros,
      createdAt: new Date(nowMs).toISOString(),
      canceledAt: null,
    };
    this.orders.set(id, order);
    if (idempotencyId) this.idempotency.set(idempotencyId, { fingerprint, orderId: id });
    return { order: this.view(order, nowMs), replayed: false };
  }

  private view(order: StoredOrder, nowMs: number): OrderView {
    return { ...order, status: orderStatus(order, nowMs) };
  }

  /** Owners see their own orders; admins see all. Foreign orders look like missing ones. */
  private ownedOrder(user: PublicUser, id: string): StoredOrder {
    const order = this.orders.get(id);
    if (!order || (order.userId !== user.id && user.role !== "admin")) {
      throw new ApiError(404, "not_found", "Pedido no encontrado.");
    }
    return order;
  }

  getOrder(user: PublicUser, id: string, nowMs: number = Date.now()): OrderView {
    return this.view(this.ownedOrder(user, id), nowMs);
  }

  listOrders(user: PublicUser, nowMs: number = Date.now()): OrderView[] {
    const all = [...this.orders.values()];
    const visible = user.role === "admin" ? all : all.filter((order) => order.userId === user.id);
    return visible.reverse().map((order) => this.view(order, nowMs));
  }

  /** Only orders that have not completed can be canceled; the full cost is refunded. */
  cancelOrder(user: PublicUser, id: string, nowMs: number = Date.now()): OrderView {
    const order = this.ownedOrder(user, id);
    const status = orderStatus(order, nowMs);
    if (status === "canceled") throw new ApiError(409, "already_canceled", "El pedido ya fue cancelado.");
    if (status === "completed") throw new ApiError(409, "not_cancelable", "Un pedido completado no se puede cancelar.");
    order.canceledAt = new Date(nowMs).toISOString();
    this.post(order.userId, "refund", order.costMicros, order.id, nowMs);
    return this.view(order, nowMs);
  }

  requestRefill(user: PublicUser, id: string, nowMs: number = Date.now()): Refill {
    const order = this.ownedOrder(user, id);
    if (order.refillDays <= 0) throw new ApiError(409, "refill_unavailable", "Este servicio no ofrece refill.");
    if (orderStatus(order, nowMs) !== "completed") {
      throw new ApiError(409, "refill_unavailable", "Solo los pedidos completados admiten refill.");
    }
    const windowEnd = Date.parse(order.createdAt) + order.refillDays * 86_400_000;
    if (nowMs > windowEnd) throw new ApiError(409, "refill_expired", "El período de refill de este pedido terminó.");
    const pending = [...this.refills.values()].find((refill) => refill.orderId === order.id);
    if (pending) throw new ApiError(409, "refill_pending", "Ya existe un refill pendiente para este pedido.", { refillId: pending.id });
    const refill: Refill = { id: this.nextId("REF"), orderId: order.id, userId: order.userId, status: "pending", createdAt: new Date(nowMs).toISOString() };
    this.refills.set(refill.id, refill);
    return refill;
  }

  getRefill(user: PublicUser, id: string): Refill {
    const refill = this.refills.get(id);
    if (!refill || (refill.userId !== user.id && user.role !== "admin")) {
      throw new ApiError(404, "not_found", "Refill no encontrado.");
    }
    return refill;
  }
}

export const DEMO_ADMIN = { email: "admin@classroom.local", password: "DemoAdmin123!", name: "Admin Demo" };
export const DEMO_CLIENT = { email: "student@classroom.local", password: "DemoUser123!", name: "Estudiante Demo" };

/** Builds a store with the accounts the current configuration calls for. */
export function createSeededStore(): Store {
  const store = new Store();
  if (isDemoMode()) {
    const admin = store.createUser({ ...DEMO_ADMIN, role: "admin" });
    store.deposit(admin.id, 1000, "SEED-DEMO");
    const client = store.createUser({ ...DEMO_CLIENT, role: "client" });
    store.deposit(client.id, 250, "SEED-DEMO");
  }
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword && adminPassword.length >= 12) {
    store.createUser({ email: adminEmail, name: "Administrador", password: adminPassword, role: "admin" });
  }
  return store;
}

const globalRef = globalThis as typeof globalThis & { __grlStore?: Store };

/** Process-wide singleton (survives dev hot reloads). */
export function getStore(): Store {
  globalRef.__grlStore ??= createSeededStore();
  return globalRef.__grlStore;
}
