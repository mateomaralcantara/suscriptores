import { NextResponse } from "next/server";
import { sendPasswordRecovery } from "@/lib/supabase-server";
import { readJsonObject } from "@/lib/api";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(`forgot:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);

  const body = (await readJsonObject(request)) ?? {};
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false, error: "El correo es obligatorio." }, { status: 400 });
  try {
    await sendPasswordRecovery(email);
  } catch (error) {
    // Same answer whether or not the account exists, so the endpoint cannot be used to discover emails.
    console.error("[auth/forgot-password]", error instanceof Error ? error.message : error);
  }
  return NextResponse.json({ ok: true });
}
