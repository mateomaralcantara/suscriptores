import { createHmac } from "node:crypto";
import { authenticate, handle, json, readJson } from "@/lib/api";
import { ApiError } from "@/lib/errors";

/** Returns a sample event signed exactly as real deliveries are, so integrators can test verification. */
export const POST = handle(async (request) => {
  await authenticate(request);
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret) throw new ApiError(501, "webhooks_not_configured", "Define WEBHOOK_SIGNING_SECRET para firmar webhooks.");
  const payload = await readJson(request, 16 * 1024);
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ event: "order.completed", timestamp, payload });
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return json({ success: true, body, headers: { "x-growth-timestamp": String(timestamp), "x-growth-signature": `sha256=${signature}` } });
});
