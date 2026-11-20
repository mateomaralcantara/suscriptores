import { NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/auth-cookies";
import { fail, readJsonObject, sameOrigin } from "@/lib/api";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { SupabaseError, signInWithPassword } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const limitedIp = rateLimit(`login:ip:${clientIp(request)}`, 20, 15 * 60 * 1000);
  if (!limitedIp.ok) return tooManyRequests(limitedIp.retryAfterSeconds);
  const body = (await readJsonObject(request)) ?? {};
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) return fail(400, "Correo y contraseña son obligatorios.");
  const limitedEmail = rateLimit(`login:email:${email}`, 8, 15 * 60 * 1000);
  if (!limitedEmail.ok) return tooManyRequests(limitedEmail.retryAfterSeconds);
  try {
    const session = await signInWithPassword(email, password);
    if (!session.access_token) return fail(502, "No fue posible iniciar sesión.");
    const response = NextResponse.json({ ok: true, user: { id: session.user?.id, email: session.user?.email } });
    setSessionCookies(response, session);
    return response;
  } catch (error) {
    if (error instanceof SupabaseError && error.code === "not_configured") return fail(503, "El servicio de autenticación no está configurado.");
    console.error("[auth/login]", error instanceof Error ? error.message : error);
    return fail(401, "Correo o contraseña incorrectos.");
  }
}
