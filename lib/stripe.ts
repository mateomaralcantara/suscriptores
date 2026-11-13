// Minimal Stripe client over the REST API (no SDK), server-side only.

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3004").replace(/\/$/, "");
}

export type CheckoutSession = { id: string; url: string };

export async function createTopupCheckoutSession(input: { profileId: string; email?: string; amountMinor: number }) {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const body = new URLSearchParams({
    mode: "payment",
    client_reference_id: input.profileId,
    success_url: `${appUrl()}/add-funds?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/add-funds?status=canceled`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(input.amountMinor),
    "line_items[0][price_data][product_data][name]": "Recarga de saldo",
    "metadata[profile_id]": input.profileId,
    "metadata[purpose]": "wallet_topup",
    "payment_intent_data[metadata][profile_id]": input.profileId,
  });
  if (input.email) body.set("customer_email", input.email);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const payload = (await response.json()) as Partial<CheckoutSession> & { error?: { message?: string } };
  if (!response.ok || !payload.id || !payload.url) {
    throw new Error(`Stripe checkout error ${response.status}: ${payload.error?.message ?? "unknown"}`);
  }
  return { id: payload.id, url: payload.url };
}
