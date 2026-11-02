import { NextResponse } from "next/server";
import { ensureProfileForUser, getOrderForProfile, getUserFromRequest } from "@/lib/supabase-server";
import { requestSmmRefill } from "@/lib/providers/smm-panel";
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

    const provider = await requestSmmRefill(String(order.provider_order_id));
    return NextResponse.json({ success: true, provider }, { status: 202 });
  } catch (error) {
    return internalError("orders/:id/refill", error, 502);
  }
}
