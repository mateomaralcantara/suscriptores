import { fail, json, readJsonObject, sameOrigin } from "@/lib/api";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { sendPasswordRecovery } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const limited = rateLimit(`forgot:ip:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);
  const body = (await readJsonObject(request)) ?? {};
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) return fail(400, "Indica tu correo.");
  try {
    await sendPasswordRecovery(email);
  } catch (error) {
    // Misma respuesta exista o no la cuenta (evita enumeración de usuarios).
    console.error("[auth/forgot-password]", error instanceof Error ? error.message : error);
  }
  return json({ ok: true });
}
