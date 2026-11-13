import { NextResponse } from "next/server";
import { signUp } from "@/lib/supabase-server";
import { setSessionCookies } from "@/lib/auth-cookies";
import { readJsonObject } from "@/lib/api";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const limited = rateLimit(`register:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);

  const body = (await readJsonObject(request)) ?? {};
  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!name || !EMAIL.test(email) || password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { ok: false, error: "Nombre, un correo válido y una contraseña de 8 a 128 caracteres son obligatorios." },
      { status: 400 },
    );
  }

  try {
    const session = await signUp(email, password, name);
    // With email confirmation enabled Supabase returns the bare user (no session, no "user" key).
    const created = (session.user ?? session) as { id?: string; email?: string };
    const response = NextResponse.json({
      ok: true,
      needsConfirmation: !session.access_token,
      user: { id: created.id, email: created.email },
    });
    setSessionCookies(response, session);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[auth/register]", message);
    const friendly = /registered|exists/i.test(message)
      ? "Ya existe una cuenta con ese correo."
      : /password/i.test(message)
        ? "La contraseña no cumple los requisitos de seguridad."
        : "No fue posible crear la cuenta. Inténtalo de nuevo.";
    return NextResponse.json({ ok: false, error: friendly }, { status: 400 });
  }
}
