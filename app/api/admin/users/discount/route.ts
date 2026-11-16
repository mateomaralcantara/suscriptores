import { NextResponse } from "next/server";
import { errorMessage, internalError, readJsonObject } from "@/lib/api";
import { requireAdminApi, supabaseRpc } from "@/lib/supabase-server";

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if ("error" in admin) return admin.error;

  const body = await readJsonObject(request);
  const profileId = String(body?.profileId ?? "");
  const discount = Number(body?.discount);
  if (!UUID.test(profileId) || !Number.isFinite(discount) || discount < 0 || discount > 100) {
    return NextResponse.json({ success: false, error: "Usuario y descuento entre 0 y 100 son obligatorios." }, { status: 400 });
  }
  try {
    const saved = await supabaseRpc<number>("admin_set_discount", { p_admin_profile_id: admin.profile.id, p_profile_id: profileId, p_discount: discount });
    return NextResponse.json({ success: true, discount: Number(saved) });
  } catch (error) {
    if (errorMessage(error).includes("profile_not_found")) return NextResponse.json({ success: false, error: "Usuario no encontrado." }, { status: 404 });
    return internalError("admin/users/discount", error);
  }
}
