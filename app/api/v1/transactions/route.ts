import { authenticate, handle, json } from "@/lib/api";
import { getStore } from "@/lib/store";
import { ledgerJson } from "@/lib/views";

export const GET = handle(async (request) => {
  const user = await authenticate(request);
  const data = getStore().listLedger(user).map(ledgerJson);
  return json({ success: true, total: data.length, data });
});
