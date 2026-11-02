import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, signUp } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string; email?: string; password?: string };
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!name || !email || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Nombre, correo y una contraseña de al menos 8 caracteres son obligatorios." },
        { status: 400 },
      );
    }

    const session = await signUp(email, password, name);
    const response = NextResponse.json({
      ok: true,
      needsConfirmation: !session.access_token,
      user: { id: session.user.id, email: session.user.email },
    });

    if (session.access_token) {
      const secure = process.env.NODE_ENV === "production";
      response.cookies.set(ACCESS_COOKIE, session.access_token, {
        httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: session.expires_in ?? 3600,
      });
      if (session.refresh_token) {
        response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
          httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
        });
      }
    }
    return response;
  } catch (error) {
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 400 });
  }
}
