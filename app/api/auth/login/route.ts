import { NextResponse } from "next/server";
import { signInWithPassword } from "@/lib/supabase-server";
import { setSessionCookies } from "@/lib/auth-cookies";
import { readJsonObject } from "@/lib/api";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limitedIp = rateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!limitedIp.ok) return tooManyRequests(limitedIp.retryAfterSeconds);

  const body = (await readJsonObject(request)) ?? {};
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Correo y contraseña son obligatorios." }, { status: 400 });
  }
  const limitedEmail = rateLimit(`login:email:${email}`, 8, 15 * 60 * 1000);
  if (!limitedEmail.ok) return tooManyRequests(limitedEmail.retryAfterSeconds);

  try {
    const session = await signInWithPassword(email, password);
    if (!session.access_token) {
      return NextResponse.json({ ok: false, error: "No fue posible iniciar sesión." }, { status: 502 });
    }
    const response = NextResponse.json({ ok: true, user: { id: session.user.id, email: session.user.email } });
    setSessionCookies(response, session);
    return response;
  } catch (error) {
    console.error("[auth/login]", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Correo o contraseña incorrectos." }, { status: 401 });
  }
}
