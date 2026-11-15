import { NextResponse } from "next/server";
import { errorMessage, internalError, readJsonObject } from "@/lib/api";
import { requireAdminApi, supabaseRpc } from "@/lib/supabase-server";

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi(request);
  if ("error" in admin) return admin.error;

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ success: false, error: "Solicitud no encontrada." }, { status: 404 });
  const body = await readJsonObject(request);
  if (typeof body?.approve !== "boolean") return NextResponse.json({ success: false, error: "Indica si apruebas o rechazas." }, { status: 400 });
  const reason = String(body.reason ?? "").trim().slice(0, 500);
  if (!body.approve && !reason) return NextResponse.json({ success: false, error: "Indica el motivo del rechazo." }, { status: 400 });

  try {
    const status = await supabaseRpc<string>("review_topup_request", {
      p_admin_profile_id: admin.profile.id,
      p_request_id: id,
      p_approve: body.approve,
      p_reason: reason || null,
    });
    return NextResponse.json({ success: true, status });
  } catch (error) {
    const message = errorMessage(error);
    if (message.includes("request_not_found")) return NextResponse.json({ success: false, error: "Solicitud no encontrada." }, { status: 404 });
    if (message.includes("request_not_pending")) return NextResponse.json({ success: false, error: "Esta solicitud ya fue revisada." }, { status: 409 });
    return internalError("admin/topups/review", error);
  }
}
