import { NextResponse } from "next/server";
import { internalError, readJsonObject } from "@/lib/api";
import { createCryptoInvoice, isNowPaymentsConfigured } from "@/lib/nowpayments";
import { parseTopupAmount, TOPUP_MAX_MINOR, TOPUP_MIN_MINOR } from "@/lib/order-status";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { ensureProfileForUser, getUserFromRequest } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!isNowPaymentsConfigured()) {
    return NextResponse.json({ success: false, error: "Los pagos con criptomonedas no están configurados." }, { status: 503 });
  }

  const limited = rateLimit(`crypto:${user.id}`, 10, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ success: false, error: "El cuerpo debe ser un objeto JSON válido." }, { status: 400 });
  const amountMinor = parseTopupAmount(body.amount);
  if (amountMinor === null) {
    return NextResponse.json(
      { success: false, error: `El monto debe estar entre US$${TOPUP_MIN_MINOR / 100} y US$${TOPUP_MAX_MINOR / 100}, con hasta 2 decimales.` },
      { status: 400 },
    );
  }

  try {
    const profile = await ensureProfileForUser(user);
    const invoice = await createCryptoInvoice({ profileId: profile.id, amountMinor });
    return NextResponse.json({ success: true, url: invoice.url }, { status: 201 });
  } catch (error) {
    return internalError("payments/crypto", error, 502);
  }
}
