import { NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/auth-cookies";
import { fail, readJsonObject, sameOrigin } from "@/lib/api";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { SupabaseError, signUp } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const limited = rateLimit(`register:ip:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);
  const body = (await readJsonObject(request)) ?? {};
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (name.length < 2 || name.length > 160) return fail(400, "Indica tu nombre completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "Correo no válido.");
  if (password.length < 10) return fail(400, "La contraseña debe tener al menos 10 caracteres.");
  try {
    const session = await signUp(email, password, name);
    if (!session.access_token) return NextResponse.json({ ok: true, data: { needsConfirmation: true } });
    const response = NextResponse.json({ ok: true, data: { needsConfirmation: false } });
    setSessionCookies(response, session);
    return response;
  } catch (error) {
    if (error instanceof SupabaseError && error.code === "not_configured") return fail(503, "El servicio de autenticación no está configurado.");
    console.error("[auth/register]", error instanceof Error ? error.message : error);
    return fail(400, "No fue posible crear la cuenta. Revisa los datos o usa otro correo.");
  }
}
