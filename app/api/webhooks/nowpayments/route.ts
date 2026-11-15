import { NextResponse } from "next/server";
import { parseTopupOrderId, verifyNowPaymentsSignature } from "@/lib/nowpayments-signature";
import { supabaseRpc } from "@/lib/supabase-server";

type Ipn = {
  payment_id?: number | string;
  invoice_id?: number | string | null;
  payment_status?: string;
  price_amount?: number | string;
  price_currency?: string;
  pay_amount?: number | string;
  pay_currency?: string;
  actually_paid?: number | string;
  order_id?: string;
};

/**
 * NOWPayments IPN. Credits the wallet once per payment when it reaches "finished"
 * (funds settled to the merchant). Partial or failed payments are only logged: an admin can
 * credit them manually with "Ajustar saldo".
 */
export async function POST(request: Request) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET?.trim();
  if (!secret) return NextResponse.json({ received: false, error: "Webhook no configurado." }, { status: 503 });

  const raw = await request.text();
  if (!verifyNowPaymentsSignature(raw, request.headers.get("x-nowpayments-sig"), secret)) {
    return NextResponse.json({ received: false, error: "Firma inválida." }, { status: 400 });
  }

  const ipn = JSON.parse(raw) as Ipn;
  const status = String(ipn.payment_status ?? "");
  if (status !== "finished") {
    if (status === "partially_paid") console.warn("[webhooks/nowpayments] partially paid, review manually", ipn.payment_id, ipn.order_id);
    return NextResponse.json({ received: true, status });
  }

  const profileId = parseTopupOrderId(ipn.order_id);
  const amountMinor = Math.round(Number(ipn.price_amount) * 100);
  if (!profileId || !Number.isInteger(amountMinor) || amountMinor <= 0 || String(ipn.price_currency ?? "").toLowerCase() !== "usd" || !ipn.payment_id) {
    console.error("[webhooks/nowpayments] unusable IPN", { payment: ipn.payment_id, order: ipn.order_id });
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const result = await supabaseRpc<string>("credit_wallet_topup", {
      p_profile_id: profileId,
      p_amount_minor: amountMinor,
      p_reference: `topup:nowpayments:${ipn.payment_id}`,
      p_metadata: {
        gateway: "nowpayments",
        payment_id: String(ipn.payment_id),
        invoice_id: ipn.invoice_id ? String(ipn.invoice_id) : null,
        pay_amount: ipn.pay_amount ?? null,
        pay_currency: ipn.pay_currency ?? null,
      },
    });
    return NextResponse.json({ received: true, result });
  } catch (error) {
    // A 500 makes NOWPayments retry; the reference keeps the credit idempotent.
    console.error("[webhooks/nowpayments] credit failed", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
