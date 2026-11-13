import { NextResponse } from "next/server";
import {
  ensureProfileForUser,
  getUserFromRequest,
  listOrdersForProfile,
} from "@/lib/supabase-server";
import { internalError, readJsonObject } from "@/lib/api";
import { createLiveOrder } from "@/lib/create-order";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const profile = await ensureProfileForUser(user);
    const orders = await listOrdersForProfile(profile.id);
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    return internalError("orders", error);
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ success: false, error: "El cuerpo debe ser un objeto JSON válido." }, { status: 400 });

  try {
    const profile = await ensureProfileForUser(user);
    const result = await createLiveOrder(user.id, profile, {
      serviceId: body.serviceId,
      link: body.link,
      quantity: body.quantity,
      runs: body.runs,
      interval: body.interval,
      idempotencyKey: request.headers.get("idempotency-key") ?? body.idempotencyKey,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error, ...(result.orderId ? { orderId: result.orderId } : {}) }, { status: result.status });
    }
    return NextResponse.json({ success: true, ...(result.duplicate ? { duplicate: true } : {}), order: result.order }, { status: result.status });
  } catch (error) {
    return internalError("orders", error);
  }
}
