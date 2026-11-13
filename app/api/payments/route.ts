import { json } from "@/lib/api";
import { TOPUP_MAX_MINOR, TOPUP_MIN_MINOR } from "@/lib/order-status";
import { isStripeConfigured } from "@/lib/stripe";

export async function GET() {
  return json({
    enabled: isStripeConfigured(),
    methods: isStripeConfigured() ? ["card"] : [],
    currency: "USD",
    min: TOPUP_MIN_MINOR / 100,
    max: TOPUP_MAX_MINOR / 100,
  });
}
