import { NextResponse } from "next/server";
import { verifyStripeSignature } from "@/lib/stripe-signature";
import { supabaseRpc } from "@/lib/supabase-server";

type CheckoutSessionObject = {
  id: string;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  payment_status?: string;
  payment_intent?: string | null;
  metadata?: Record<string, string> | null;
};

type StripeEvent = { id: string; type: string; data?: { object?: CheckoutSessionObject } };

const CREDIT_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ received: false, error: "Webhook no configurado." }, { status: 503 });

  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ received: false, error: "Firma inválida." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ received: false, error: "JSON inválido." }, { status: 400 });
  }

  const session = event.data?.object;
  if (!CREDIT_EVENTS.has(event.type) || !session || session.metadata?.purpose !== "wallet_topup") {
    return NextResponse.json({ received: true, ignored: true });
  }
  if (session.payment_status !== "paid") {
    // Delayed payment methods are credited later by checkout.session.async_payment_succeeded.
    return NextResponse.json({ received: true, pending: true });
  }

  const profileId = session.client_reference_id ?? session.metadata?.profile_id;
  const amountMinor = Number(session.amount_total);
  if (!profileId || !Number.isInteger(amountMinor) || amountMinor <= 0 || (session.currency ?? "usd").toLowerCase() !== "usd") {
    console.error("[webhooks/stripe] unusable checkout session", { id: session.id, event: event.id });
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const result = await supabaseRpc<string>("credit_wallet_topup", {
      p_profile_id: profileId,
      p_amount_minor: amountMinor,
      p_reference: `topup:${session.id}`,
      p_metadata: { stripe_session_id: session.id, stripe_event_id: event.id, payment_intent: session.payment_intent ?? null },
    });
    return NextResponse.json({ received: true, result });
  } catch (error) {
    // A 500 makes Stripe retry; the reference keeps the credit idempotent.
    console.error("[webhooks/stripe] credit failed", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
