import { NextResponse } from "next/server";
import { ensureProfileForUser, getOrderForProfile, getUserFromRequest } from "@/lib/supabase-server";
import { requestSmmRefill } from "@/lib/providers/smm-panel";
import { errorMessage } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const profile = await ensureProfileForUser(user);
    const order = await getOrderForProfile(profile.id, id);
    if (!order) return NextResponse.json({ success: false, error: "Pedido no encontrado." }, { status: 404 });
    if (!order.provider_order_id) {
      return NextResponse.json({ success: false, error: "El pedido aún no tiene ID confirmado del proveedor." }, { status: 409 });
    }

    const provider = await requestSmmRefill(String(order.provider_order_id));
    return NextResponse.json({ success: true, provider });
  } catch (error) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 502 });
  }
}
