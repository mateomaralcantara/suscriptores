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
};

export type SmmBalance = {
  balance: string;
  currency: string;
};

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

type ParamValue = string | number | boolean | null | undefined;

export class SmmPanelError extends Error {
  ambiguous: boolean;

  constructor(message: string, ambiguous = false) {
    super(message);
    this.name = "SmmPanelError";
    this.ambiguous = ambiguous;
  }
}

function getConfig() {
  const url = process.env.SMM_PANEL_API_URL?.trim();
  const key = process.env.SMM_PANEL_API_KEY?.trim();

  if (!url || !key) {
    throw new SmmPanelError(
      "SMM provider is not configured. Set SMM_PANEL_API_URL and SMM_PANEL_API_KEY.",
    );
  }

  return { url, key };
}

async function callSmmPanel<T>(
  params: Record<string, ParamValue>,
  options: { mutation?: boolean } = {},
): Promise<T> {
  const { url, key } = getConfig();
  const body = new URLSearchParams();
  body.set("key", key);

  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      body.set(name, String(value));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown;

    try {
      payload = JSON.parse(text);
    } catch {
      throw new SmmPanelError(
        `SMM provider returned invalid JSON (HTTP ${response.status}).`,
        Boolean(options.mutation),
      );
    }

    if (!response.ok) {
      throw new SmmPanelError(
        `SMM provider HTTP error ${response.status}.`,
        Boolean(options.mutation && response.status >= 500),
      );
    }

    if (
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error?: unknown }).error === "string"
    ) {
      throw new SmmPanelError((payload as { error: string }).error, false);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof SmmPanelError) throw error;
    const message = error instanceof Error ? error.message : "Unknown provider error";
    throw new SmmPanelError(message, Boolean(options.mutation));
  } finally {
    clearTimeout(timeout);
  }
}

export function getSmmMarkupPercent() {
  const value = Number(process.env.SMM_MARKUP_PERCENT ?? "30");
  return Number.isFinite(value) && value >= 0 ? value : 30;
}

export function applySmmMarkup(providerRate: number) {
  return providerRate * (1 + getSmmMarkupPercent() / 100);
}

export function smmLiveOrdersEnabled() {
  return process.env.SMM_LIVE_ORDERS_ENABLED?.toLowerCase() === "true";
}

export function isSmmConfigured() {
  return Boolean(process.env.SMM_PANEL_API_URL?.trim() && process.env.SMM_PANEL_API_KEY?.trim());
}

export async function getSmmServices() {
  return callSmmPanel<SmmService[]>({ action: "services" });
}

export async function getSmmBalance() {
  return callSmmPanel<SmmBalance>({ action: "balance" });
}

export async function createSmmOrder(input: CreateSmmOrderInput) {
  return callSmmPanel<{ order: string | number }>(
    {
      action: "add",
      service: input.service,
      link: input.link,
      quantity: input.quantity,
      runs: input.runs,
      interval: input.interval,
    },
    { mutation: true },
  );
}

export async function getSmmOrderStatus(order: string | number) {
  return callSmmPanel<SmmOrderStatus>({ action: "status", order });
}

export async function getSmmOrdersStatus(orders: string) {
  return callSmmPanel<Record<string, SmmOrderStatus>>({ action: "status", orders });
}

export async function requestSmmRefill(order: string | number) {
  return callSmmPanel<Record<string, unknown>>({ action: "refill", order }, { mutation: true });
}

export async function requestSmmRefills(orders: string) {
  return callSmmPanel<Record<string, unknown>>({ action: "refill", orders }, { mutation: true });
}

export async function getSmmRefillStatus(refill: string | number) {
  return callSmmPanel<Record<string, unknown>>({ action: "refill_status", refill });
}

export async function getSmmRefillsStatus(refills: string) {
  return callSmmPanel<Record<string, unknown>>({ action: "refill_status", refills });
}

export async function cancelSmmOrders(orders: string) {
  return callSmmPanel<Record<string, unknown>>({ action: "cancel", orders }, { mutation: true });
}
