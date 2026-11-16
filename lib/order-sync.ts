import { getProviderOrdersStatus, providerForOrder, type SmmProvider } from "@/lib/providers/smm-panel";
import { normalizeProviderStatus } from "@/lib/order-status";
import { serviceRoleRest, supabaseRpc } from "@/lib/supabase-server";

type OpenOrder = { id: string; provider_order_id: string; status: string; metadata: Record<string, unknown> | null };

export type SyncSummary = { checked: number; updated: number; errors: number };

/**
 * Refreshes up to `limit` open orders (least recently checked first) from their providers and
 * applies status changes and refunds through apply_provider_status.
 */
export async function syncOpenOrders(limit = 100): Promise<SyncSummary> {
  const orders = await serviceRoleRest<OpenOrder[]>(
    `orders?status=in.(queued,processing,cancel_requested)&provider_order_id=not.is.null` +
      `&select=id,provider_order_id,status,metadata&order=provider_checked_at.asc.nullsfirst&limit=${Math.min(Math.max(limit, 1), 100)}`,
  );
  if (orders.length === 0) return { checked: 0, updated: 0, errors: 0 };

  // Provider order IDs are only unique per provider, so query each provider separately.
  const byProvider = new Map<string, { provider: SmmProvider; orders: OpenOrder[] }>();
  let errors = 0;
  for (const order of orders) {
    const provider = providerForOrder(order);
    if (!provider) {
      errors += 1;
      continue;
    }
    const group = byProvider.get(provider.key) ?? { provider, orders: [] };
    group.orders.push(order);
    byProvider.set(provider.key, group);
  }

  let updated = 0;
  for (const { provider, orders: group } of byProvider.values()) {
    let statuses: Record<string, Record<string, unknown>>;
    try {
      statuses = await getProviderOrdersStatus(provider, group.map((order) => order.provider_order_id).join(","));
    } catch (error) {
      errors += group.length;
      console.error(`[order-sync] ${provider.name} status failed`, error);
      continue;
    }
    for (const order of group) {
      const providerStatus = statuses[order.provider_order_id];
      const normalized = normalizeProviderStatus(typeof providerStatus?.status === "string" ? providerStatus.status : null);
      if (!providerStatus || !normalized) {
        if (providerStatus && "error" in providerStatus) errors += 1;
        continue;
      }
      if (normalized === order.status) continue;
      try {
        const remains = Number(providerStatus.remains);
        const result = await supabaseRpc<string>("apply_provider_status", {
          p_order_id: order.id,
          p_status: normalized,
          p_remains: Number.isFinite(remains) ? Math.trunc(remains) : null,
          p_payload: providerStatus,
        });
        if (result === normalized) updated += 1;
      } catch (error) {
        errors += 1;
        console.error("[order-sync] apply_provider_status failed", order.id, error);
      }
    }
  }

  await supabaseRpc("touch_provider_check", { p_order_ids: orders.map((order) => order.id) });
  return { checked: orders.length, updated, errors };
}
