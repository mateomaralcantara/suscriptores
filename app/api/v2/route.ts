/**
 * Reseller API in the de-facto "SMM panel API v2" format (the one Perfect Panel-style panels
 * use), so other panels can add this one as a provider with just the URL and a key.
 * POST form-encoded or JSON: key, action, ...  Errors are `{ "error": "..." }` (HTTP 200 for
 * business errors, as client scripts expect; 401 for a bad key, 429 when rate limited).
 */
import { apiKeyMatches, parseApiKey, toApiV2Status } from "@/lib/api-keys";
import { createLiveOrder } from "@/lib/create-order";
import { cancelProviderOrders, getCatalog, providerForOrder, requestProviderRefill } from "@/lib/providers/smm-panel";
import { canCancelOrder, canRefillOrder } from "@/lib/order-status";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { findProfileByApiKey, getOrderForProfile, getWalletForProfile, supabaseRpc, type OrderRow, type ProfileRow } from "@/lib/supabase-server";

const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
const error = (message: string, status = 200) => reply({ error: message }, status);

async function readParams(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      return Object.fromEntries(Object.entries(body ?? {}).map(([k, v]) => [k, String(v ?? "")]));
    }
    const form = await request.formData();
    return Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));
  } catch {
    return {};
  }
}

function orderStatus(order: OrderRow) {
  const provider = (order.metadata?.provider_status ?? {}) as { start_count?: string; remains?: string };
  return {
    charge: (order.cost_minor / 100).toFixed(4),
    start_count: String(provider.start_count ?? "0"),
    status: toApiV2Status(order.status),
    remains: String(provider.remains ?? (order.status === "completed" ? "0" : order.quantity)),
    currency: "USD",
  };
}

function ids(value: string | undefined, max = 100) {
  return (value ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, max);
}

async function handle(profile: ProfileRow, params: Record<string, string>) {
  switch (params.action) {
    case "services": {
      const { data } = await getCatalog();
      return reply(data.map((service) => ({
        service: service.id,
        name: service.name,
        type: service.type,
        category: service.category,
        rate: service.rate.toFixed(4),
        min: String(service.min),
        max: String(service.max),
        refill: service.refill,
        cancel: service.cancel,
        dripfeed: service.dripfeed,
      })));
    }
    case "add": {
      // Resellers rarely send an idempotency key; derive one so a retried request cannot double-charge.
      const idempotencyKey = params.idempotency_key || `api:${params.service}:${params.link}:${params.quantity}:${params.runs ?? ""}:${Math.floor(Date.now() / 60000)}`;
      const result = await createLiveOrder(profile.auth_user_id, profile, {
        serviceId: params.service, link: params.link, quantity: params.quantity, runs: params.runs, interval: params.interval, idempotencyKey,
      });
      return result.ok ? reply({ order: result.order.publicId }) : error(result.error);
    }
    case "status": {
      if (params.orders) {
        const out: Record<string, unknown> = {};
        for (const id of ids(params.orders)) {
          const order = await getOrderForProfile(profile.id, id);
          out[id] = order ? orderStatus(order) : { error: "Incorrect order ID" };
        }
        return reply(out);
      }
      const order = params.order ? await getOrderForProfile(profile.id, params.order) : null;
      return order ? reply(orderStatus(order)) : error("Incorrect order ID");
    }
    case "balance": {
      const wallet = await getWalletForProfile(profile.id);
      return reply({ balance: ((wallet?.available_minor ?? 0) / 100).toFixed(4), currency: "USD" });
    }
    case "refill": {
      const order = params.order ? await getOrderForProfile(profile.id, params.order) : null;
      if (!order) return error("Incorrect order ID");
      const orderProvider = providerForOrder(order);
      if (!canRefillOrder(order) || !orderProvider) return error("Refill not available for this order");
      const provider = await requestProviderRefill(orderProvider, String(order.provider_order_id));
      return reply({ refill: String((provider as { refill?: unknown }).refill ?? order.public_id) });
    }
    case "cancel": {
      const out = [];
      for (const id of ids(params.orders ?? params.order)) {
        const order = await getOrderForProfile(profile.id, id);
        const orderProvider = order ? providerForOrder(order) : null;
        if (!order || !orderProvider || !canCancelOrder(order)) {
          out.push({ order: id, cancel: { error: order ? "Order cannot be canceled" : "Incorrect order ID" } });
          continue;
        }
        await cancelProviderOrders(orderProvider, String(order.provider_order_id));
        await supabaseRpc("request_order_cancel", { p_order_id: order.id, p_payload: { source: "api_v2" } });
        out.push({ order: id, cancel: 1 });
      }
      return reply(out);
    }
    default:
      return error("Incorrect request");
  }
}

export async function POST(request: Request) {
  const limitedIp = rateLimit(`v2:ip:${clientIp(request)}`, 300, 60 * 1000);
  if (!limitedIp.ok) return error("Too many requests", 429);

  const params = await readParams(request);
  const parsed = parseApiKey(params.key ?? "");
  if (!parsed) return error("Invalid API key", 401);

  try {
    const profile = await findProfileByApiKey(parsed.prefix, (hash) => apiKeyMatches(parsed.key, hash));
    if (!profile) return error("Invalid API key", 401);
    const limitedKey = rateLimit(`v2:key:${parsed.prefix}`, 120, 60 * 1000);
    if (!limitedKey.ok) return error("Too many requests", 429);
    return await handle(profile, params);
  } catch (err) {
    console.error("[api/v2]", err);
    return error("Internal error, try again later", 500);
  }
}

// Some reseller scripts probe the endpoint with GET.
export async function GET() {
  return error("Use POST with key and action");
}

