// NOWPayments (crypto) client over its REST API, server-side only.
import { randomBytes } from "node:crypto";
import { appUrl } from "@/lib/stripe";

const API = "https://api.nowpayments.io/v1";

export function isNowPaymentsConfigured() {
  return Boolean(process.env.NOWPAYMENTS_API_KEY?.trim() && process.env.NOWPAYMENTS_IPN_SECRET?.trim());
}

/** Creates a hosted invoice; the customer picks the coin on NOWPayments' page. */
export async function createCryptoInvoice(input: { profileId: string; amountMinor: number }) {
  const key = process.env.NOWPAYMENTS_API_KEY?.trim();
  if (!key) throw new Error("NOWPAYMENTS_API_KEY is not configured.");

  const response = await fetch(`${API}/invoice`, {
    method: "POST",
    headers: { "x-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      price_amount: input.amountMinor / 100,
      price_currency: "usd",
      order_id: `${input.profileId}:${randomBytes(9).toString("base64url")}`,
      order_description: "Recarga de saldo",
      ipn_callback_url: `${appUrl()}/api/webhooks/nowpayments`,
      success_url: `${appUrl()}/add-funds?status=success`,
      cancel_url: `${appUrl()}/add-funds?status=canceled`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const payload = (await response.json()) as { id?: string | number; invoice_url?: string; message?: string };
  if (!response.ok || !payload.invoice_url) {
    throw new Error(`NOWPayments invoice error ${response.status}: ${payload.message ?? "unknown"}`);
  }
  return { id: String(payload.id), url: payload.invoice_url };
}
