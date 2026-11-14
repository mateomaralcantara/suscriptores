import { NextResponse } from "next/server";
import {
  ensureProfileForUser,
  getOrderForProfile,
  getUserFromRequest,
  supabaseRpc,
} from "@/lib/supabase-server";
import { getProviderOrderStatus, providerForOrder } from "@/lib/providers/smm-panel";
import { isTerminalStatus, normalizeProviderStatus } from "@/lib/order-status";
import { internalError } from "@/lib/api";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const profile = await ensureProfileForUser(user);
    let order = await getOrderForProfile(profile.id, id);
    if (!order) return NextResponse.json({ success: false, error: "Pedido no encontrado." }, { status: 404 });

    const orderProvider = providerForOrder(order);
    if (order.provider_order_id && orderProvider && !isTerminalStatus(order.status)) {
      try {
        const provider = await getProviderOrderStatus(orderProvider, order.provider_order_id);
        const normalized = normalizeProviderStatus(provider.status);
        if (normalized && normalized !== order.status) {
          // Status change and any refund (canceled/partial) happen atomically in the database.
          const remains = Number(provider.remains);
          await supabaseRpc<string>("apply_provider_status", {
            p_order_id: order.id,
            p_status: normalized,
            p_remains: Number.isFinite(remains) ? Math.trunc(remains) : null,
            p_payload: provider,
          });
          order = (await getOrderForProfile(profile.id, order.id)) ?? order;
        }
      } catch (error) {
        // A provider refresh must never hide the local order from its owner.
        console.error("[orders/:id] provider status refresh failed", error);
      }
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return internalError("orders/:id", error);
  }
}
