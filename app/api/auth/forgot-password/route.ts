import { NextResponse } from "next/server";
import { sendPasswordRecovery } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: "El correo es obligatorio." }, { status: 400 });
    await sendPasswordRecovery(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 400 });
  }
}
