import { NextResponse } from "next/server";
import {
  ensureProfileForUser,
  getOrderForProfile,
  getUserFromRequest,
  supabaseRpc,
} from "@/lib/supabase-server";
import { getProviderOrderStatus, providerForOrder, type SmmOrderStatus } from "@/lib/providers/smm-panel";
import { isTerminalStatus, normalizeProviderStatus, orderProgress } from "@/lib/order-status";
import { internalError } from "@/lib/api";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const profile = await ensureProfileForUser(user);
    let order = await getOrderForProfile(profile.id, id);
    if (!order) return NextResponse.json({ success: false, error: "Pedido no encontrado." }, { status: 404 });

    // Live provider data (start count, remains) for the progress bar; stored data for finished orders.
    let live: SmmOrderStatus | null = (order.metadata?.provider_status as SmmOrderStatus | undefined) ?? null;
    let checkedAt: string | null = null;

    const orderProvider = providerForOrder(order);
    if (order.provider_order_id && orderProvider && !isTerminalStatus(order.status)) {
      try {
        const provider = await getProviderOrderStatus(orderProvider, order.provider_order_id);
        live = provider;
        checkedAt = new Date().toISOString();
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

    return NextResponse.json({
      success: true,
      data: order,
      progress: { ...orderProgress(order.quantity, order.status, live?.start_count, live?.remains), checkedAt },
    });
  } catch (error) {
    return internalError("orders/:id", error);
  }
}
