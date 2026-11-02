import { apiError, json, readJsonObject } from "@/lib/api";
import { orderServices } from "@/lib/order-services";
import { validateOrder, type OrderInput } from "@/lib/order-rules";

const MAX_BULK_ORDERS = 10000;

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body || !Array.isArray(body.orders)) return apiError(400, "Se esperaba { orders: [...] }.");
  if (body.orders.length === 0) return apiError(422, "El lote está vacío.");
  if (body.orders.length > MAX_BULK_ORDERS) return apiError(413, `Máximo ${MAX_BULK_ORDERS} pedidos por lote.`);

  const rejected: { index: number; errors: Record<string, string> }[] = [];
  let accepted = 0;
  let totalCharge = 0;
  body.orders.forEach((entry, index) => {
    const result = validateOrder((entry && typeof entry === "object" ? entry : {}) as OrderInput, orderServices);
    if (result.ok) {
      accepted += 1;
      totalCharge += result.order.charge;
    } else {
      rejected.push({ index, errors: result.errors });
    }
  });

  return json(
    {
      success: accepted > 0,
      mode: "sandbox",
      batchId: `BULK-DEMO-${crypto.randomUUID()}`,
      status: accepted > 0 ? "queued" : "rejected",
      accepted,
      rejected: rejected.length,
      errors: rejected.slice(0, 100),
      charge: Math.round(totalCharge * 10000) / 10000,
      currency: "USD",
    },
    { status: accepted > 0 ? 202 : 422 },
  );
}
