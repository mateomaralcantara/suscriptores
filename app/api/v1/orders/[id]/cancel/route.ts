import { NextResponse } from "next/server";
import {
  ensureProfileForUser,
  getOrderForProfile,
  getUserFromRequest,
  supabaseRpc,
} from "@/lib/supabase-server";
import { cancelProviderOrders, providerForOrder } from "@/lib/providers/smm-panel";
import { canCancelOrder } from "@/lib/order-status";
import { internalError } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const profile = await ensureProfileForUser(user);
    const order = await getOrderForProfile(profile.id, id);
    if (!order) return NextResponse.json({ success: false, error: "Pedido no encontrado." }, { status: 404 });
    if (!canCancelOrder(order)) {
      return NextResponse.json(
        { success: false, error: `El pedido en estado "${order.status}" no se puede cancelar.` },
        { status: 409 },
      );
    }

    const orderProvider = providerForOrder(order);
    if (!orderProvider) return NextResponse.json({ success: false, error: "El proveedor de este pedido ya no está configurado." }, { status: 409 });
    const provider = await cancelProviderOrders(orderProvider, String(order.provider_order_id));
    // The refund is applied when the provider reports the order as canceled (see apply_provider_status).
    const status = await supabaseRpc<string>("request_order_cancel", { p_order_id: order.id, p_payload: { provider } });
    return NextResponse.json({ success: true, status, provider }, { status: 202 });
  } catch (error) {
    return internalError("orders/:id/cancel", error, 502);
  }
}
