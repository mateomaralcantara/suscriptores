import { errorMessage } from "@/lib/api";
import { billableQuantity, isHttpUrl, orderCostMinor, parseDripFeed } from "@/lib/order-status";
import { applyMarkup } from "@/lib/order-status";
import { createProviderOrder, findCatalogService, smmLiveOrdersEnabled, SmmPanelError } from "@/lib/providers/smm-panel";
import { supabaseRpc, type ProfileRow } from "@/lib/supabase-server";

export type OrderInput = {
  serviceId: unknown;
  link: unknown;
  quantity: unknown;
  runs?: unknown;
  interval?: unknown;
  idempotencyKey: unknown;
};

export type OrderResult =
  | { ok: true; status: 200 | 201; duplicate: boolean; order: { id: string; publicId: string; status: string; cost: number; currency: "USD" } }
  | { ok: false; status: number; error: string; orderId?: string };

type ReservationRow = { order_id: string; public_id: string; status: string; cost_minor: number; is_existing: boolean };

const fail = (status: number, error: string, orderId?: string): OrderResult => ({ ok: false, status, error, ...(orderId ? { orderId } : {}) });

/**
 * Single entry point for creating a live order (panel, reseller API v2 and bulk orders):
 * validate → price → reserve funds atomically → submit to provider → confirm / fail / mark unknown.
 */
export async function createLiveOrder(authUserId: string, profile: ProfileRow, input: OrderInput): Promise<OrderResult> {
  if (!smmLiveOrdersEnabled()) return fail(503, "Los pedidos reales están deshabilitados hasta completar la configuración de producción.");

  const serviceId = String(input.serviceId ?? "").trim();
  const link = String(input.link ?? "").trim();
  const quantity = Number(input.quantity);
  const idempotencyKey = String(input.idempotencyKey ?? "").trim().slice(0, 200);
  if (!serviceId || !link || !Number.isInteger(quantity) || quantity <= 0 || !idempotencyKey) {
    return fail(400, "Servicio, URL, cantidad e idempotencyKey válidos son obligatorios.");
  }
  if (!isHttpUrl(link)) return fail(400, "La URL objetivo debe ser http(s) válida.");
  const dripFeed = parseDripFeed(input.runs, input.interval);
  if (typeof dripFeed === "string") return fail(400, dripFeed);

  let found;
  try {
    found = await findCatalogService(serviceId);
  } catch (error) {
    console.error("[create-order] provider catalog", error);
    return fail(502, "El proveedor no respondió correctamente. Inténtalo de nuevo.");
  }
  if (!found) return fail(404, "Servicio no encontrado.");
  const { provider, service } = found;
  if (dripFeed && !service.dripfeed) return fail(400, "Este servicio no admite drip-feed.");
  if (quantity < service.min || quantity > service.max) {
    return fail(400, `La cantidad debe estar entre ${service.min} y ${service.max}.`);
  }

  const saleRate = applyMarkup(service.providerRate, provider.markupPercent);
  const costMinor = orderCostMinor(saleRate, billableQuantity(quantity, dripFeed));

  let reservation: ReservationRow | undefined;
  try {
    const rows = await supabaseRpc<ReservationRow[]>("reserve_smm_order", {
      p_auth_user_id: authUserId,
      p_external_service_id: serviceId,
      p_target: link,
      p_quantity: quantity,
      p_cost_minor: costMinor,
      p_idempotency_key: idempotencyKey,
      p_metadata: {
        provider: provider.key,
        provider_name: provider.name,
        provider_service_id: service.providerServiceId,
        service_name: service.name,
        category: service.category,
        type: service.type,
        sale_rate: saleRate,
        profile_id: profile.id,
        ...(dripFeed ? { drip_feed: dripFeed, billable_quantity: billableQuantity(quantity, dripFeed) } : {}),
      },
    });
    reservation = Array.isArray(rows) ? rows[0] : undefined;
  } catch (error) {
    const message = errorMessage(error);
    if (message.includes("insufficient_funds")) return fail(402, "Balance insuficiente.");
    if (message.includes("duplicate key")) return fail(409, "Ya hay un pedido en curso con esta idempotencyKey.");
    console.error("[create-order] reserve", error);
    return fail(500, "Error interno. Inténtalo de nuevo.");
  }
  if (!reservation) return fail(500, "No fue posible reservar el balance para el pedido.");

  const summary = (status: string) => ({
    id: reservation.order_id, publicId: reservation.public_id, status, cost: Number(reservation.cost_minor) / 100, currency: "USD" as const,
  });
  if (reservation.is_existing) return { ok: true, status: 200, duplicate: true, order: summary(reservation.status) };

  try {
    const providerOrder = await createProviderOrder(provider, {
      service: service.providerServiceId, link, quantity, runs: dripFeed?.runs, interval: dripFeed?.interval,
    });
    const providerOrderId = String(providerOrder.order ?? "").trim();
    if (!providerOrderId) throw new SmmPanelError("El proveedor no devolvió un ID de pedido.", true);
    const status = await supabaseRpc<string>("confirm_smm_order", { p_order_id: reservation.order_id, p_provider_order_id: providerOrderId });
    return { ok: true, status: 201, duplicate: false, order: summary(typeof status === "string" ? status : "queued") };
  } catch (providerError) {
    const message = errorMessage(providerError);
    const ambiguous = providerError instanceof SmmPanelError && providerError.ambiguous;
    try {
      await supabaseRpc(ambiguous ? "mark_smm_order_unknown" : "fail_smm_order", { p_order_id: reservation.order_id, p_error: message });
    } catch (settleError) {
      // The order stays pending_provider with funds reserved; an admin can reconcile it.
      console.error("[create-order] could not settle after provider error", reservation.order_id, settleError);
      return fail(502, "El proveedor no respondió correctamente. El pedido queda en revisión.", reservation.public_id);
    }
    if (ambiguous) {
      return fail(502, "El proveedor no confirmó la respuesta. El balance permanece reservado hasta conciliar el pedido.", reservation.public_id);
    }
    console.error("[create-order] provider rejected order", providerError);
    return fail(502, "El proveedor rechazó el pedido. El balance reservado fue devuelto.", reservation.public_id);
  }
}
