import { authenticate, handle, json, readJson } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { getStore } from "@/lib/store";
import { parseOrderInput } from "@/lib/validation";
import { orderJson } from "@/lib/views";

export const GET = handle(async (request) => {
  const user = await authenticate(request);
  const data = getStore().listOrders(user).map(orderJson);
  return json({ success: true, total: data.length, data });
});

export const POST = handle(async (request) => {
  const user = await authenticate(request);
  const input = parseOrderInput(await readJson(request));
  const key = request.headers.get("idempotency-key");
  if (key !== null && (key.length === 0 || key.length > 128)) {
    throw new ApiError(422, "validation_failed", "Idempotency-Key debe tener entre 1 y 128 caracteres.");
  }
  const { order, replayed } = getStore().placeOrder(user, input, key);
  return json({ success: true, replayed, data: orderJson(order) }, { status: replayed ? 200 : 201 });
});
