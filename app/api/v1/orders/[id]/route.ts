import { NextResponse } from "next/server";
import {
  ensureProfileForUser,
  getOrderForProfile,
  getUserFromRequest,
  serviceRoleRest,
} from "@/lib/supabase-server";
import { getSmmOrderStatus } from "@/lib/providers/smm-panel";
import { errorMessage } from "@/lib/api";

function normalizeProviderStatus(status?: string) {
  const value = (status ?? "").trim().toLowerCase();
  if (value === "completed") return "completed";
  if (value === "partial") return "partial";
  if (value === "canceled" || value === "cancelled") return "canceled";
  if (value === "processing" || value === "in progress") return "processing";
  if (value === "pending") return "queued";
  return null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const profile = await ensureProfileForUser(user);
    let order = await getOrderForProfile(profile.id, id);
    if (!order) return NextResponse.json({ success: false, error: "Pedido no encontrado." }, { status: 404 });

    if (order.provider_order_id) {
      try {
        const provider = await getSmmOrderStatus(order.provider_order_id);
        const normalized = normalizeProviderStatus(provider.status);
        if (normalized && normalized !== order.status) {
          const updated = await serviceRoleRest<typeof order[]>(
            `orders?id=eq.${encodeURIComponent(order.id)}&user_id=eq.${encodeURIComponent(profile.id)}`,
            {
              method: "PATCH",
              headers: { Prefer: "return=representation" },
              body: JSON.stringify({
                status: normalized,
                updated_at: new Date().toISOString(),
                metadata: { ...(order.metadata ?? {}), provider_status: provider },
              }),
            },
          );
          order = updated[0] ?? order;
        }
      } catch {
        // A provider refresh must never hide the local order from its owner.
      }
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}
