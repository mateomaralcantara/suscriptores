import { NextResponse } from "next/server";
import {
  ensureProfileForUser,
  getUserFromRequest,
  listOrdersForProfile,
  supabaseRpc,
} from "@/lib/supabase-server";
import {
  applySmmMarkup,
  createSmmOrder,
  getSmmServices,
  smmLiveOrdersEnabled,
  SmmPanelError,
} from "@/lib/providers/smm-panel";
import { errorMessage } from "@/lib/api";

type ReservationRow = {
  order_id: string;
  public_id: string;
  status: string;
  cost_minor: number;
  is_existing: boolean;
};

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const profile = await ensureProfileForUser(user);
    const orders = await listOrdersForProfile(profile.id);
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!smmLiveOrdersEnabled()) {
    return NextResponse.json(
      { success: false, error: "Los pedidos reales están deshabilitados hasta completar la configuración de producción." },
      { status: 503 },
    );
  }

  let reservedOrderId: string | null = null;

  try {
    const body = await request.json() as {
      serviceId?: string | number;
      link?: string;
      quantity?: number;
      runs?: number;
      interval?: number;
      idempotencyKey?: string;
    };

    const serviceId = String(body.serviceId ?? "").trim();
    const link = String(body.link ?? "").trim();
    const quantity = Number(body.quantity);
    const idempotencyKey = String(body.idempotencyKey ?? "").trim();

    if (!serviceId || !link || !Number.isInteger(quantity) || quantity <= 0 || !idempotencyKey) {
      return NextResponse.json(
        { success: false, error: "Servicio, URL, cantidad e idempotencyKey válidos son obligatorios." },
        { status: 400 },
      );
    }
    try {
      new URL(link);
    } catch {
      return NextResponse.json({ success: false, error: "La URL objetivo no es válida." }, { status: 400 });
    }

    const services = await getSmmServices();
    const service = services.find((item) => String(item.service) === serviceId);
    if (!service) return NextResponse.json({ success: false, error: "Servicio no encontrado." }, { status: 404 });

    const min = Number(service.min);
    const max = Number(service.max);
    const providerRate = Number(service.rate);
    if (!Number.isFinite(min) || !Number.isFinite(max) || quantity < min || quantity > max) {
      return NextResponse.json(
        { success: false, error: `La cantidad debe estar entre ${service.min} y ${service.max}.` },
        { status: 400 },
      );
    }
    if (!Number.isFinite(providerRate) || providerRate < 0) {
      return NextResponse.json({ success: false, error: "El proveedor devolvió una tarifa inválida." }, { status: 502 });
    }

    const saleRate = applySmmMarkup(providerRate);
    const costMinor = Math.max(1, Math.ceil((saleRate * quantity / 1000) * 100));
    const profile = await ensureProfileForUser(user);

    const reservationPayload = await supabaseRpc<ReservationRow[]>("reserve_smm_order", {
      p_auth_user_id: user.id,
      p_external_service_id: serviceId,
      p_target: link,
      p_quantity: quantity,
      p_cost_minor: costMinor,
      p_idempotency_key: idempotencyKey,
      p_metadata: {
        service_name: service.name,
        category: service.category,
        type: service.type,
        sale_rate: saleRate,
        profile_id: profile.id,
      },
    });

    const reservation = Array.isArray(reservationPayload) ? reservationPayload[0] : null;
    if (!reservation) throw new Error("No fue posible reservar el balance para el pedido.");
    reservedOrderId = reservation.order_id;

    if (reservation.is_existing) {
      return NextResponse.json({ success: true, duplicate: true, order: reservation });
    }

    try {
      const providerOrder = await createSmmOrder({
        service: serviceId,
        link,
        quantity,
        runs: body.runs,
        interval: body.interval,
      });
      const providerOrderId = String(providerOrder.order ?? "").trim();
      if (!providerOrderId) throw new SmmPanelError("El proveedor no devolvió un ID de pedido.", true);

      const status = await supabaseRpc<string>("confirm_smm_order", {
        p_order_id: reservation.order_id,
        p_provider_order_id: providerOrderId,
      });

      return NextResponse.json(
        {
          success: true,
          order: {
            id: reservation.order_id,
            publicId: reservation.public_id,
            status: typeof status === "string" ? status : "queued",
            cost: costMinor / 100,
            currency: "USD",
          },
        },
        { status: 201 },
      );
    } catch (providerError) {
      const message = errorMessage(providerError);
      if (providerError instanceof SmmPanelError && providerError.ambiguous) {
        await supabaseRpc("mark_smm_order_unknown", {
          p_order_id: reservation.order_id,
          p_error: message,
        });
        return NextResponse.json(
          {
            success: false,
            error: "El proveedor no confirmó la respuesta. El balance permanece reservado hasta reconciliar el pedido.",
            orderId: reservation.public_id,
          },
          { status: 502 },
        );
      }

      await supabaseRpc("fail_smm_order", {
        p_order_id: reservation.order_id,
        p_error: message,
      });
      return NextResponse.json({ success: false, error: message }, { status: 502 });
    }
  } catch (error) {
    const message = errorMessage(error);
    const status = message.includes("insufficient_funds") ? 402 : 500;
    return NextResponse.json(
      { success: false, error: status === 402 ? "Balance insuficiente." : message, reservedOrderId },
      { status },
    );
  }
}
