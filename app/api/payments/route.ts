import { authenticate, handle, json, readJson } from "@/lib/api";
import { isDemoMode } from "@/lib/config";
import { ApiError } from "@/lib/errors";
import { getStore } from "@/lib/store";
import { parseDepositAmount } from "@/lib/validation";
import { ledgerJson } from "@/lib/views";

export const GET = handle(async (request) => {
  await authenticate(request);
  return json({ success: true, methods: isDemoMode() ? ["sandbox_credit"] : [] });
});

/**
 * Simulated deposit. It credits the wallet without charging anyone, so it only exists
 * in demo mode; a live deployment must wire a real payment gateway and its webhooks.
 */
export const POST = handle(async (request) => {
  const user = await authenticate(request);
  if (!isDemoMode()) throw new ApiError(501, "payments_not_configured", "No hay una pasarela de pago configurada.");
  const amount = parseDepositAmount(await readJson(request));
  const entry = getStore().deposit(user.id, amount, "SANDBOX-DEPOSIT");
  return json({ success: true, data: ledgerJson(entry) }, { status: 201 });
});
