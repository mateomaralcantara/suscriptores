import { getSmmOrdersStatus } from "@/lib/providers/smm-panel";
import { normalizeProviderStatus } from "@/lib/order-status";
import { serviceRoleRest, supabaseRpc } from "@/lib/supabase-server";

type OpenOrder = { id: string; provider_order_id: string; status: string };

export type SyncSummary = { checked: number; updated: number; errors: number };

/**
 * Refreshes up to `limit` open orders (least recently checked first) from the provider and
 * applies status changes and refunds through apply_provider_status.
 */
export async function syncOpenOrders(limit = 100): Promise<SyncSummary> {
  const orders = await serviceRoleRest<OpenOrder[]>(
    `orders?status=in.(queued,processing,cancel_requested)&provider_order_id=not.is.null` +
      `&select=id,provider_order_id,status&order=provider_checked_at.asc.nullsfirst&limit=${Math.min(Math.max(limit, 1), 100)}`,
  );
  if (orders.length === 0) return { checked: 0, updated: 0, errors: 0 };

  const statuses = await getSmmOrdersStatus(orders.map((order) => order.provider_order_id).join(","));
  let updated = 0;
  let errors = 0;

  for (const order of orders) {
    const provider = statuses[order.provider_order_id];
    const normalized = normalizeProviderStatus(typeof provider?.status === "string" ? provider.status : null);
    if (!provider || !normalized) {
      if (provider && "error" in provider) errors += 1;
      continue;
    }
    if (normalized === order.status) continue;
    try {
      const remains = Number(provider.remains);
      const result = await supabaseRpc<string>("apply_provider_status", {
        p_order_id: order.id,
        p_status: normalized,
        p_remains: Number.isFinite(remains) ? Math.trunc(remains) : null,
        p_payload: provider,
      });
      if (result === normalized) updated += 1;
    } catch (error) {
      errors += 1;
      console.error("[order-sync] apply_provider_status failed", order.id, error);
    }
  }

  await supabaseRpc("touch_provider_check", { p_order_ids: orders.map((order) => order.id) });
  return { checked: orders.length, updated, errors };
}
