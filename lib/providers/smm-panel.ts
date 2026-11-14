import { applyMarkup, fromPublicServiceId, parseMarkupPercent, PROVIDER_ID_BLOCK, toPublicServiceId } from "@/lib/order-status";

/**
 * Client for providers that speak the standard "SMM panel API v2" (Perfect Panel and compatible).
 * Several providers can be configured:
 *   slot 1 (default): SMM_PANEL_API_URL, SMM_PANEL_API_KEY, optional SMM_PANEL_NAME
 *   slot 2..5:        SMM_PROVIDER_<n>_NAME, SMM_PROVIDER_<n>_API_URL, SMM_PROVIDER_<n>_API_KEY,
 *                     optional SMM_PROVIDER_<n>_MARKUP_PERCENT
 * Public service IDs are offset per slot (see toPublicServiceId) so they never collide.
 */

export type SmmService = {
  service: string | number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string | number;
  max: string | number;
  refill: boolean;
  cancel: boolean;
  dripfeed?: boolean;
};

export type SmmBalance = { balance: string; currency: string };

export type SmmOrderStatus = {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  [key: string]: unknown;
};

export type CreateSmmOrderInput = {
  service: string | number;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
};

export type SmmProvider = {
  key: string;
  name: string;
  url: string;
  apiKey: string;
  offset: number;
  markupPercent: number;
};

/** A provider service as sold in this panel. */
export type CatalogService = {
  id: string;
  providerKey: string;
  providerName: string;
  providerServiceId: string;
  name: string;
  type: string;
  category: string;
  providerRate: number;
  rate: number;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  dripfeed: boolean;
};

type ParamValue = string | number | boolean | null | undefined;

export class SmmPanelError extends Error {
  ambiguous: boolean;

  constructor(message: string, ambiguous = false) {
    super(message);
    this.name = "SmmPanelError";
    this.ambiguous = ambiguous;
  }
}

export const DEFAULT_PROVIDER_KEY = "smmpanel";
const MAX_PROVIDERS = 5;

export function getSmmMarkupPercent() {
  return parseMarkupPercent(process.env.SMM_MARKUP_PERCENT);
}

export function applySmmMarkup(providerRate: number, markupPercent = getSmmMarkupPercent()) {
  return applyMarkup(providerRate, markupPercent);
}

export function smmLiveOrdersEnabled() {
  return process.env.SMM_LIVE_ORDERS_ENABLED?.toLowerCase() === "true";
}

export function getSmmProviders(): SmmProvider[] {
  const env = process.env;
  const defaultMarkup = getSmmMarkupPercent();
  const providers: SmmProvider[] = [];
  const url = env.SMM_PANEL_API_URL?.trim();
  const apiKey = env.SMM_PANEL_API_KEY?.trim();
  if (url && apiKey) {
    providers.push({ key: DEFAULT_PROVIDER_KEY, name: env.SMM_PANEL_NAME?.trim() || "SMM-Panel", url, apiKey, offset: 0, markupPercent: defaultMarkup });
  }
  for (let slot = 2; slot <= MAX_PROVIDERS; slot += 1) {
    const prefix = `SMM_PROVIDER_${slot}_`;
    const slotUrl = env[`${prefix}API_URL`]?.trim();
    const slotKey = env[`${prefix}API_KEY`]?.trim();
    if (!slotUrl || !slotKey) continue;
    const markup = env[`${prefix}MARKUP_PERCENT`];
    providers.push({
      key: `provider${slot}`,
      name: env[`${prefix}NAME`]?.trim() || `Proveedor ${slot}`,
      url: slotUrl,
      apiKey: slotKey,
      offset: (slot - 1) * PROVIDER_ID_BLOCK,
      markupPercent: markup?.trim() ? parseMarkupPercent(markup) : defaultMarkup,
    });
  }
  return providers;
}

export function isSmmConfigured() {
  return getSmmProviders().length > 0;
}

export function getProviderByKey(key: string | null | undefined) {
  return getSmmProviders().find((provider) => provider.key === (key || DEFAULT_PROVIDER_KEY)) ?? null;
}

/** Provider that fulfilled an order (orders created before multi-provider support used the default one). */
export function providerForOrder(order: { metadata?: Record<string, unknown> | null }) {
  const key = typeof order.metadata?.provider === "string" ? order.metadata.provider : DEFAULT_PROVIDER_KEY;
  return getProviderByKey(key);
}

async function callProvider<T>(provider: SmmProvider, params: Record<string, ParamValue>, options: { mutation?: boolean } = {}): Promise<T> {
  const body = new URLSearchParams();
  body.set("key", provider.apiKey);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") body.set(name, String(value));
  }

  try {
    const response = await fetch(provider.url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new SmmPanelError(`${provider.name} returned invalid JSON (HTTP ${response.status}).`, Boolean(options.mutation));
    }
    if (!response.ok) {
      throw new SmmPanelError(`${provider.name} HTTP error ${response.status}.`, Boolean(options.mutation && response.status >= 500));
    }
    if (payload && typeof payload === "object" && "error" in payload && typeof (payload as { error?: unknown }).error === "string") {
      throw new SmmPanelError((payload as { error: string }).error, false);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof SmmPanelError) throw error;
    throw new SmmPanelError(error instanceof Error ? error.message : "Unknown provider error", Boolean(options.mutation));
  }
}

export function getProviderServices(provider: SmmProvider) {
  return callProvider<SmmService[]>(provider, { action: "services" });
}

export function getProviderBalance(provider: SmmProvider) {
  return callProvider<SmmBalance>(provider, { action: "balance" });
}

export function createProviderOrder(provider: SmmProvider, input: CreateSmmOrderInput) {
  return callProvider<{ order: string | number }>(
    provider,
    { action: "add", service: input.service, link: input.link, quantity: input.quantity, runs: input.runs, interval: input.interval },
    { mutation: true },
  );
}

export function getProviderOrderStatus(provider: SmmProvider, order: string | number) {
  return callProvider<SmmOrderStatus>(provider, { action: "status", order });
}

export function getProviderOrdersStatus(provider: SmmProvider, orders: string) {
  return callProvider<Record<string, SmmOrderStatus>>(provider, { action: "status", orders });
}

export function requestProviderRefill(provider: SmmProvider, order: string | number) {
  return callProvider<Record<string, unknown>>(provider, { action: "refill", order }, { mutation: true });
}

export function cancelProviderOrders(provider: SmmProvider, orders: string) {
  return callProvider<Record<string, unknown>>(provider, { action: "cancel", orders }, { mutation: true });
}

function toCatalogService(provider: SmmProvider, service: SmmService): CatalogService | null {
  const id = toPublicServiceId(provider.offset, service.service);
  const providerRate = Number(service.rate);
  const min = Number(service.min);
  const max = Number(service.max);
  if (!id || !Number.isFinite(providerRate) || providerRate < 0 || !Number.isFinite(min) || !Number.isFinite(max) || max < min || max <= 0) return null;
  return {
    id,
    providerKey: provider.key,
    providerName: provider.name,
    providerServiceId: String(service.service),
    name: service.name,
    type: service.type,
    category: service.category,
    providerRate,
    rate: Number(applyMarkup(providerRate, provider.markupPercent).toFixed(6)),
    min,
    max,
    refill: Boolean(service.refill),
    cancel: Boolean(service.cancel),
    dripfeed: Boolean(service.dripfeed),
  };
}

let catalogCache: { at: number; signature: string; data: CatalogService[]; failed: string[] } | null = null;

/**
 * Combined catalog of every configured provider, cached for 60 s. A provider that is down is
 * skipped (listed in `failed`); it only throws when no provider answers.
 */
export async function getCatalog(maxAgeMs = 60_000) {
  const providers = getSmmProviders();
  if (providers.length === 0) throw new SmmPanelError("No SMM provider is configured.");
  const signature = providers.map((p) => `${p.key}:${p.url}:${p.markupPercent}`).join("|");
  if (catalogCache && catalogCache.signature === signature && Date.now() - catalogCache.at < maxAgeMs) return catalogCache;

  const results = await Promise.allSettled(providers.map((provider) => getProviderServices(provider)));
  const data: CatalogService[] = [];
  const failed: string[] = [];
  results.forEach((result, index) => {
    const provider = providers[index];
    if (result.status === "rejected" || !Array.isArray(result.value)) {
      failed.push(provider.name);
      console.error(`[providers] ${provider.name} catalog failed`, result.status === "rejected" ? result.reason : "not an array");
      return;
    }
    for (const service of result.value) {
      const item = toCatalogService(provider, service);
      if (item) data.push(item);
    }
  });
  if (data.length === 0 && failed.length > 0) throw new SmmPanelError(`Ningún proveedor respondió (${failed.join(", ")}).`);
  catalogCache = { at: Date.now(), signature, data, failed };
  return catalogCache;
}

/** Finds a public service ID in the catalog, with the provider that sells it. */
export async function findCatalogService(publicId: string) {
  const decoded = fromPublicServiceId(publicId);
  if (!decoded) return null;
  const provider = getSmmProviders().find((item) => item.offset === decoded.offset);
  if (!provider) return null;
  const { data } = await getCatalog();
  const service = data.find((item) => item.id === String(publicId));
  return service ? { provider, service } : null;
}
