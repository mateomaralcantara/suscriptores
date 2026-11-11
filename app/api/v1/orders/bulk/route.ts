import { authenticate, handle, json, readJson } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { orderCostMicros } from "@/lib/money";
import { getStore } from "@/lib/store";
import { orderInputProblems, type OrderInput } from "@/lib/validation";
import { orderJson } from "@/lib/views";

const MAX_BULK_ORDERS = 100;

/** All-or-nothing: the batch is only charged when every row is valid and the wallet covers the total. */
export const POST = handle(async (request) => {
  const user = await authenticate(request);
  const body = (await readJson(request)) as { orders?: unknown };
  if (typeof body !== "object" || body === null || !Array.isArray(body.orders) || body.orders.length === 0) {
    throw new ApiError(422, "validation_failed", "orders debe ser una lista con al menos un pedido.");
  }
  if (body.orders.length > MAX_BULK_ORDERS) {
    throw new ApiError(422, "validation_failed", `Un lote admite como máximo ${MAX_BULK_ORDERS} pedidos.`);
  }

  const inputs: OrderInput[] = [];
  const rejected: Array<{ index: number; problems: string[] }> = [];
  body.orders.forEach((raw, index) => {
    const { problems, value } = orderInputProblems(raw);
    if (value) inputs.push(value);
    else rejected.push({ index, problems });
  });
  if (rejected.length > 0) throw new ApiError(422, "validation_failed", "El lote contiene pedidos inválidos.", rejected);

  const store = getStore();
  const totalMicros = inputs.reduce((sum, input) => sum + orderCostMicros(input.service.rate, input.quantity), 0);
  if (totalMicros > store.balanceMicros(user.id)) {
    throw new ApiError(402, "insufficient_funds", "Saldo insuficiente para el lote completo.");
  }
  const data = inputs.map((input) => orderJson(store.placeOrder(user, input, null).order));
  return json({ success: true, accepted: data.length, data }, { status: 201 });
});
