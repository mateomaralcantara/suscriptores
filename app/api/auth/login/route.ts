import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, signInWithPassword } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Correo y contraseña son obligatorios." }, { status: 400 });
    }

    const session = await signInWithPassword(email, password);
    if (!session.access_token) {
      return NextResponse.json({ ok: false, error: "Supabase no devolvió una sesión válida." }, { status: 502 });
    }

    const response = NextResponse.json({ ok: true, user: { id: session.user.id, email: session.user.email } });
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(ACCESS_COOKIE, session.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: session.expires_in ?? 3600,
    });
    if (session.refresh_token) {
      response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 401 });
  }
}
