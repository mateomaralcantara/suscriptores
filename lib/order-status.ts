/**
 * Pure order-status and pricing rules shared by pages, API routes and tests.
 * No runtime imports or path aliases: `node --test` imports this file directly.
 */

/** Statuses after which the provider will not change the order any more. */
export const TERMINAL_STATUSES = ["completed", "partial", "canceled", "failed", "refunded"] as const;

/** Statuses from which the customer may still ask the provider to cancel. */
export const CANCELABLE_STATUSES = ["queued", "processing"] as const;

/** Statuses eligible for a refill request. */
export const REFILLABLE_STATUSES = ["completed", "partial"] as const;

export type ProviderStatus = "queued" | "processing" | "completed" | "partial" | "canceled";

const includes = (list: readonly string[], value: string) => list.includes(value);

export function isTerminalStatus(status: string) {
  return includes(TERMINAL_STATUSES, status);
}

export function canCancelOrder(order: { status: string; provider_order_id?: string | null }) {
  return Boolean(order.provider_order_id) && includes(CANCELABLE_STATUSES, order.status);
}

export function canRefillOrder(order: { status: string; provider_order_id?: string | null }) {
  return Boolean(order.provider_order_id) && includes(REFILLABLE_STATUSES, order.status);
}

/** Maps the free-form status strings returned by SMM providers to internal statuses. */
export function normalizeProviderStatus(status?: string | null): ProviderStatus | null {
  const value = (status ?? "").trim().toLowerCase();
  if (value === "completed") return "completed";
  if (value === "partial") return "partial";
  if (value === "canceled" || value === "cancelled") return "canceled";
  if (value === "processing" || value === "in progress") return "processing";
  if (value === "pending") return "queued";
  return null;
}

/**
 * Amount (minor units) to give back to the customer when the provider reports a
 * final status. Mirrors `apply_provider_status` in database/migrations/003.
 */
export function refundForStatus(status: ProviderStatus, costMinor: number, quantity: number, remains: number | null) {
  if (status === "canceled") return costMinor;
  if (status !== "partial" || remains === null || !Number.isFinite(remains) || quantity <= 0) return 0;
  const clamped = Math.min(Math.max(Math.trunc(remains), 0), quantity);
  return Math.floor((costMinor * clamped) / quantity);
}

/** Sale rate per 1000 units after applying the markup percentage. */
export function applyMarkup(providerRate: number, markupPercent: number) {
  return providerRate * (1 + markupPercent / 100);
}

/** Order cost in minor units (cents), rounded up, never below 1 cent. */
export function orderCostMinor(saleRatePer1000: number, quantity: number) {
  // Round to 6 decimals first so float noise (e.g. 12.000000001) does not add a cent.
  const cents = Math.round(((saleRatePer1000 * quantity) / 1000) * 100 * 1e6) / 1e6;
  return Math.max(1, Math.ceil(cents));
}

/** Parses SMM_MARKUP_PERCENT; invalid or negative values fall back to 30. */
export function parseMarkupPercent(raw: string | undefined) {
  const value = Number(raw ?? "30");
  return raw !== undefined && raw.trim() !== "" && Number.isFinite(value) && value >= 0 ? value : 30;
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Top-up limits in minor units (USD cents). */
export const TOPUP_MIN_MINOR = 500;
export const TOPUP_MAX_MINOR = 200000;

/** Parses a USD amount ("25", "25.5", 25) into cents; null when invalid or outside the limits. */
export function parseTopupAmount(value: unknown): number | null {
  const amount = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  if (!Number.isFinite(amount)) return null;
  const cents = Math.round(amount * 100);
  if (Math.abs(amount * 100 - cents) > 1e-6) return null;
  return cents >= TOPUP_MIN_MINOR && cents <= TOPUP_MAX_MINOR ? cents : null;
}

/** Drip-feed limits: number of deliveries and minutes between them. */
export const DRIPFEED_MAX_RUNS = 100;
export const DRIPFEED_MAX_INTERVAL = 1440;

export type DripFeed = { runs: number; interval: number } | null;

/**
 * Validates optional drip-feed parameters. Returns null for a normal order, the parsed values,
 * or an error message. With drip-feed the provider delivers `quantity` on every run, so the
 * customer must be charged quantity × runs.
 */
export function parseDripFeed(runs: unknown, interval: unknown): DripFeed | string {
  const empty = (value: unknown) => value === undefined || value === null || value === "" || value === 0 || value === "0";
  if (empty(runs) && empty(interval)) return null;
  const r = Number(runs);
  const i = Number(interval);
  if (!Number.isInteger(r) || r < 2 || r > DRIPFEED_MAX_RUNS) return `Drip-feed: las entregas deben ser un entero entre 2 y ${DRIPFEED_MAX_RUNS}.`;
  if (!Number.isInteger(i) || i < 1 || i > DRIPFEED_MAX_INTERVAL) return `Drip-feed: el intervalo debe ser de 1 a ${DRIPFEED_MAX_INTERVAL} minutos.`;
  return { runs: r, interval: i };
}

/** Units the provider will deliver in total (and that the customer pays for). */
export function billableQuantity(quantity: number, dripFeed: DripFeed) {
  return dripFeed ? quantity * dripFeed.runs : quantity;
}
