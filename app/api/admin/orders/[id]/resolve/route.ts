import { NextResponse } from "next/server";
import { errorMessage, internalError, readJsonObject } from "@/lib/api";
import { requireAdminApi, supabaseRpc } from "@/lib/supabase-server";

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi(request);
  if ("error" in admin) return admin.error;

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ success: false, error: "Pedido no encontrado." }, { status: 404 });
  const body = (await readJsonObject(request)) ?? {};
  const providerOrderId = String(body.providerOrderId ?? "").trim().slice(0, 100);

  try {
    const status = await supabaseRpc<string>("resolve_unknown_order", {
      p_admin_profile_id: admin.profile.id,
      p_order_id: id,
      p_provider_order_id: providerOrderId || null,
    });
    return NextResponse.json({ success: true, status });
  } catch (error) {
    const message = errorMessage(error);
    if (message.includes("order_not_found")) return NextResponse.json({ success: false, error: "Pedido no encontrado." }, { status: 404 });
    if (message.includes("order_not_unknown")) return NextResponse.json({ success: false, error: "El pedido ya no está pendiente de conciliación." }, { status: 409 });
    return internalError("admin/orders/:id/resolve", error);
  }
}
