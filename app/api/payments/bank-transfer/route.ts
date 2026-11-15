import { NextResponse } from "next/server";
import { errorMessage, internalError, readJsonObject } from "@/lib/api";
import { getBankAccounts, getBankTransferRate, isBankTransferConfigured, listTopupRequestsForProfile } from "@/lib/bank-transfer";
import { localAmountMinor, parseTopupAmount, TOPUP_MAX_MINOR, TOPUP_MIN_MINOR } from "@/lib/order-status";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { ensureProfileForUser, getUserFromRequest, supabaseRpc } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  try {
    const profile = await ensureProfileForUser(user);
    return NextResponse.json({ success: true, data: await listTopupRequestsForProfile(profile.id) });
  } catch (error) {
    return internalError("payments/bank-transfer", error);
  }
}

/** The customer reports a transfer already made; an admin verifies it before crediting. */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!isBankTransferConfigured()) {
    return NextResponse.json({ success: false, error: "Las transferencias bancarias no están configuradas." }, { status: 503 });
  }
  const limited = rateLimit(`bank-transfer:${user.id}`, 10, 60 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);

  const body = await readJsonObject(request);
  const bank = String(body?.bank ?? "").trim();
  const reference = String(body?.reference ?? "").trim();
  const note = String(body?.note ?? "").trim().slice(0, 500);
  const amountMinor = parseTopupAmount(body?.amount);

  if (!getBankAccounts().some((account) => account.name === bank)) {
    return NextResponse.json({ success: false, error: "Elige uno de los bancos indicados." }, { status: 400 });
  }
  if (amountMinor === null) {
    return NextResponse.json({ success: false, error: `El monto debe estar entre US$${TOPUP_MIN_MINOR / 100} y US$${TOPUP_MAX_MINOR / 100}.` }, { status: 400 });
  }
  if (reference.length < 3 || reference.length > 80) {
    return NextResponse.json({ success: false, error: "Escribe el número de referencia o confirmación de la transferencia." }, { status: 400 });
  }

  const rate = getBankTransferRate();
  try {
    const profile = await ensureProfileForUser(user);
    const publicId = await supabaseRpc<string>("create_topup_request", {
      p_profile_id: profile.id,
      p_bank: bank,
      p_amount_minor: amountMinor,
      p_local_amount_minor: localAmountMinor(amountMinor, rate),
      p_exchange_rate: rate,
      p_reference: reference,
      p_note: note || null,
    });
    return NextResponse.json({ success: true, id: publicId }, { status: 201 });
  } catch (error) {
    const message = errorMessage(error);
    if (message.includes("duplicate_reference")) return NextResponse.json({ success: false, error: "Esa referencia ya fue reportada." }, { status: 409 });
    if (message.includes("too_many_pending")) return NextResponse.json({ success: false, error: "Tienes 5 recargas pendientes de verificación. Espera a que las revisemos." }, { status: 409 });
    return internalError("payments/bank-transfer", error);
  }
}
