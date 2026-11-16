import { NextResponse } from "next/server";
import { ensureProfileForUser, getOrderForProfile, getUserFromRequest } from "@/lib/supabase-server";
import { providerForOrder, requestProviderRefill } from "@/lib/providers/smm-panel";
import { canRefillOrder } from "@/lib/order-status";
import { internalError } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const profile = await ensureProfileForUser(user);
    const order = await getOrderForProfile(profile.id, id);
    if (!order) return NextResponse.json({ success: false, error: "Pedido no encontrado." }, { status: 404 });
    if (!canRefillOrder(order)) {
      return NextResponse.json(
        { success: false, error: `El pedido en estado "${order.status}" no admite refill.` },
        { status: 409 },
      );
    }

    const orderProvider = providerForOrder(order);
    if (!orderProvider) return NextResponse.json({ success: false, error: "El proveedor de este pedido ya no está configurado." }, { status: 409 });
    const provider = await requestProviderRefill(orderProvider, String(order.provider_order_id));
    return NextResponse.json({ success: true, provider }, { status: 202 });
  } catch (error) {
    return internalError("orders/:id/refill", error, 502);
  }
}
