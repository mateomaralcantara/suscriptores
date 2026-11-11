import { authenticate, handle, json } from "@/lib/api";
import { microsToUsd } from "@/lib/money";
import { getStore } from "@/lib/store";

export const GET = handle(async (request) => {
  const user = await authenticate(request);
  return json({ success: true, currency: "USD", available: microsToUsd(getStore().balanceMicros(user.id)) });
});
