import { json } from "@/lib/api";
import { TOPUP_MAX_MINOR, TOPUP_MIN_MINOR } from "@/lib/order-status";
import { isStripeConfigured } from "@/lib/stripe";
import { isNowPaymentsConfigured } from "@/lib/nowpayments";
import { isBankTransferConfigured } from "@/lib/bank-transfer";

export async function GET() {
  return json({
    enabled: isStripeConfigured() || isNowPaymentsConfigured() || isBankTransferConfigured(),
    methods: [...(isNowPaymentsConfigured() ? ["crypto"] : []), ...(isStripeConfigured() ? ["card"] : []), ...(isBankTransferConfigured() ? ["bank_transfer"] : [])],
    currency: "USD",
    min: TOPUP_MIN_MINOR / 100,
    max: TOPUP_MAX_MINOR / 100,
  });
}
