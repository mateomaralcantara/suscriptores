// NOWPayments (crypto) client over its REST API, server-side only.
import { randomBytes } from "node:crypto";
import { appUrl } from "@/lib/stripe";

const API = "https://api.nowpayments.io/v1";

/**
 * Optional: force the coin on the invoice (e.g. "usdttrc20"). Off by default: forcing it has left
 * NOWPayments' hosted page empty, so restrict coins in the NOWPayments dashboard (Settings > Coins)
 * instead and let the customer pick among the enabled ones.
 */
export function getNowPaymentsPayCurrency() {
  const value = process.env.NOWPAYMENTS_PAY_CURRENCY?.trim().toLowerCase() || "any";
  return value === "any" ? null : value;
}

/** Human label for the configured coin. */
export function getNowPaymentsPayLabel() {
  const coin = getNowPaymentsPayCurrency();
  if (!coin) return "USDT y otras criptomonedas";
  const known: Record<string, string> = { usdttrc20: "USDT (red TRON · TRC20)", usdterc20: "USDT (red Ethereum · ERC20)", usdtbsc: "USDT (red BNB · BEP20)", usdtsol: "USDT (red Solana)" };
  return known[coin] ?? coin.toUpperCase();
}

export function isNowPaymentsConfigured() {
  return Boolean(process.env.NOWPAYMENTS_API_KEY?.trim() && process.env.NOWPAYMENTS_IPN_SECRET?.trim());
}

/** Creates a hosted NOWPayments invoice; the customer picks among the coins enabled in the dashboard. */
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
      ...(getNowPaymentsPayCurrency() ? { pay_currency: getNowPaymentsPayCurrency() } : {}),
      // Optional: add network fees to what the customer pays (off by default, opt in with "true").
      ...(process.env.NOWPAYMENTS_FEE_PAID_BY_USER?.trim().toLowerCase() === "true" ? { is_fee_paid_by_user: true } : {}),
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
