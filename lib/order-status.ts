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

/**
 * Public service IDs across several providers: provider slot N uses the block
 * [offset, offset + PROVIDER_ID_BLOCK). The first provider has offset 0, so its IDs never change.
 */
export const PROVIDER_ID_BLOCK = 10_000_000;

export function toPublicServiceId(offset: number, providerServiceId: string | number): string | null {
  const id = Number(providerServiceId);
  if (!Number.isInteger(id) || id < 0 || id >= PROVIDER_ID_BLOCK) return null;
  return String(offset + id);
}

export function fromPublicServiceId(publicId: string | number): { offset: number; providerServiceId: string } | null {
  const id = Number(publicId);
  if (!Number.isInteger(id) || id < 0) return null;
  const offset = Math.floor(id / PROVIDER_ID_BLOCK) * PROVIDER_ID_BLOCK;
  return { offset, providerServiceId: String(id - offset) };
}

/** "3 horas 57 minutos" style duration for average delivery times. */
export function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes) || minutes < 0) return "Sin datos todavía";
  const total = Math.max(1, Math.round(minutes));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} ${days === 1 ? "día" : "días"}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? "hora" : "horas"}`);
  if (mins && days === 0) parts.push(`${mins} ${mins === 1 ? "minuto" : "minutos"}`);
  return parts.join(" ");
}

export type Buyer = { isAdmin: boolean; discountPercent: number };

/**
 * Sale price per 1000 for a given buyer. Admins pay the provider cost (no markup). Customers pay
 * cost + markup minus their personal discount, but never less than the provider cost.
 */
export function priceForBuyer(providerRate: number, markupPercent: number, buyer: Buyer) {
  if (!Number.isFinite(providerRate) || providerRate < 0) return 0;
  if (buyer.isAdmin) return providerRate;
  const list = applyMarkup(providerRate, markupPercent);
  const discount = Number.isFinite(buyer.discountPercent) ? Math.min(Math.max(buyer.discountPercent, 0), 100) : 0;
  return Math.max(providerRate, list * (1 - discount / 100));
}

/** Cheapest first; ties by numeric service ID so the order is stable. */
export function byPriceAsc<T extends { rate: number; id: string | number }>(a: T, b: T) {
  return a.rate - b.rate || Number(a.id) - Number(b.id);
}

// ---------------------------------------------------------------------------
// Average delivery time hints taken from provider data.
// ---------------------------------------------------------------------------

const UNIT_MINUTES: Record<string, number> = { m: 1, min: 1, mins: 1, minute: 1, minutes: 1, minuto: 1, minutos: 1, h: 60, hr: 60, hrs: 60, hour: 60, hours: 60, hora: 60, horas: 60, d: 1440, day: 1440, days: 1440, dia: 1440, "día": 1440, dias: 1440, "días": 1440 };

/** Parses "3 hours 57 minutes", "1 day 2 hrs", "45 min" or a plain number of minutes. */
export function parseDurationText(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  if (/^\s*\d+(\.\d+)?\s*$/.test(value)) return Number(value);
  let total = 0;
  let found = false;
  for (const match of value.toLowerCase().matchAll(/(\d+(?:\.\d+)?)\s*(minutos?|minutes?|mins?|m|horas?|hours?|hrs?|h|días?|dias?|days?|d)\b/g)) {
    total += Number(match[1]) * (UNIT_MINUTES[match[2]] ?? 0);
    found = true;
  }
  return found ? total : null;
}

/** Start time from a service name, in minutes (middle of the range): "0-1 Hour Start", "Start Time: 0 - 3 Hrs", "Instant Start". */
export function parseStartMinutes(name: string): number | null {
  const text = name.toLowerCase();
  if (/instant/.test(text)) return 5;
  const range = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to|a)\s*(\d+(?:\.\d+)?)\s*(minutos?|minutes?|mins?|horas?|hours?|hrs?|h|días?|dias?|days?)\b(?:\s*(?:start|de inicio|inicio))?/);
  const near = /(start|inicio)/.test(text);
  if (range && near) return ((Number(range[1]) + Number(range[2])) / 2) * (UNIT_MINUTES[range[3]] ?? 60);
  return null;
}

/** Units per day from a service name: "Daily 10-20K", "Speed: Up to 300/D", "1-2K diarios", "100K/day". Middle of ranges. */
export function parseDailySpeed(name: string): number | null {
  const text = name.toLowerCase().replace(/,/g, "");
  const amount = (n: string, k?: string) => Number(n) * (k === "k" || k === "mil" ? 1000 : k === "m" ? 1_000_000 : 1);
  const patterns = [
    /daily\s*(\d+(?:\.\d+)?)\s*(k|m)?\s*(?:-|–)\s*(\d+(?:\.\d+)?)\s*(k|m)?/,
    /(\d+(?:\.\d+)?)\s*(k|m|mil)?\s*(?:-|–)\s*(\d+(?:\.\d+)?)\s*(k|m|mil)?\s*(?:\/\s*d(?:ay)?\b|per day|diarios?|al día|daily)/,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const high = amount(m[3], m[4]);
      const low = amount(m[1], m[2] ?? m[4]);
      if (high > 0) return (low + high) / 2;
    }
  }
  const single = text.match(/(?:daily|up to|speed:?\s*up to)\s*(\d+(?:\.\d+)?)\s*(k|m)?\b/) ?? text.match(/(\d+(?:\.\d+)?)\s*(k|m|mil)?\s*(?:\/\s*d(?:ay)?\b|per day|diarios?|daily)/);
  if (single) {
    const value = amount(single[1], single[2]);
    return value > 0 ? value : null;
  }
  return null;
}

/** Estimated completion in minutes for a quantity: start time + quantity / daily speed. */
export function estimateDeliveryMinutes(quantity: number, startMinutes: number | null, dailySpeed: number | null): number | null {
  if (startMinutes === null && dailySpeed === null) return null;
  const delivery = dailySpeed && dailySpeed > 0 && Number.isFinite(quantity) && quantity > 0 ? (quantity / dailySpeed) * 1440 : 0;
  return Math.round((startMinutes ?? 0) + delivery);
}

export const STATUS_LABELS: Record<string, string> = {
  pending_provider: "Enviando al proveedor",
  provider_unknown: "En revisión",
  queued: "En cola",
  processing: "En proceso",
  cancel_requested: "Cancelación solicitada",
  completed: "Completado",
  partial: "Parcial",
  canceled: "Cancelado",
  failed: "Fallido",
  refunded: "Reembolsado",
};

export type OrderProgress = { delivered: number; remains: number; percent: number; startCount: number | null; currentCount: number | null };

/**
 * Delivery progress from the provider's "start_count" and "remains" (strings in API v2).
 * Completed orders are 100 %; unknown remains on an open order means nothing delivered yet.
 */
export function orderProgress(quantity: number, status: string, startCountRaw: unknown, remainsRaw: unknown): OrderProgress {
  const startCount = Number(startCountRaw);
  const remainsNumber = Number(remainsRaw);
  const known = remainsRaw !== null && remainsRaw !== undefined && remainsRaw !== "" && Number.isFinite(remainsNumber);
  const remains = status === "completed" ? 0 : known ? Math.min(Math.max(Math.trunc(remainsNumber), 0), quantity) : quantity;
  const delivered = Math.max(0, quantity - remains);
  const validStart = startCountRaw !== null && startCountRaw !== undefined && startCountRaw !== "" && Number.isFinite(startCount) && startCount >= 0 ? Math.trunc(startCount) : null;
  return {
    delivered,
    remains,
    percent: quantity > 0 ? Math.round((delivered / quantity) * 1000) / 10 : 0,
    startCount: validStart,
    currentCount: validStart === null ? null : validStart + delivered,
  };
}

/** Local-currency amount (minor units) for a USD top-up, rounded UP to a whole unit (e.g. RD$631.00). */
export function localAmountMinor(usdMinor: number, rate: number) {
  if (!Number.isFinite(usdMinor) || !Number.isFinite(rate) || usdMinor <= 0 || rate <= 0) return 0;
  return Math.ceil(Math.round(usdMinor * rate * 1e4) / 1e4 / 100) * 100;
}
