import { NextResponse } from "next/server";
import { errorMessage, internalError, readJsonObject } from "@/lib/api";
import { requireAdminApi, supabaseRpc } from "@/lib/supabase-server";

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if ("error" in admin) return admin.error;

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ success: false, error: "El cuerpo debe ser un objeto JSON válido." }, { status: 400 });
  const profileId = String(body.profileId ?? "");
  const amount = Number(body.amount);
  const reason = String(body.reason ?? "").trim();
  const amountMinor = Math.round(amount * 100);
  if (!UUID.test(profileId) || !Number.isFinite(amount) || amountMinor === 0 || Math.abs(amountMinor) > 10_000_000 || !reason) {
    return NextResponse.json({ success: false, error: "Usuario, monto distinto de 0 (máx. US$100.000) y motivo son obligatorios." }, { status: 400 });
  }

  try {
    const available = await supabaseRpc<number>("admin_adjust_wallet", {
      p_admin_profile_id: admin.profile.id,
      p_profile_id: profileId,
      p_amount_minor: amountMinor,
      p_reason: reason.slice(0, 500),
    });
    return NextResponse.json({ success: true, available: Number(available) / 100 });
  } catch (error) {
    const message = errorMessage(error);
    if (message.includes("insufficient_funds")) return NextResponse.json({ success: false, error: "El saldo no puede quedar negativo." }, { status: 409 });
    if (message.includes("profile_not_found")) return NextResponse.json({ success: false, error: "Usuario no encontrado." }, { status: 404 });
    return internalError("admin/wallets/adjust", error);
  }
}
