import { orders } from "@/lib/demo-data";
import { apiError, json, readJsonObject } from "@/lib/api";
import { orderServices } from "@/lib/order-services";
import { validateOrder } from "@/lib/order-rules";

export async function GET() {
  return json({ success: true, mode: "sandbox", total: orders.length, data: orders });
}

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return apiError(400, "El cuerpo debe ser un objeto JSON válido.");

  const result = validateOrder(body, orderServices);
  if (!result.ok) return apiError(422, "Pedido inválido.", result.errors);

  const { service, link, quantity, charge } = result.order;
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? (typeof body.idempotencyKey === "string" ? body.idempotencyKey : null);

  return json(
    {
      success: true,
      mode: "sandbox",
      orderId: `ORD-DEMO-${crypto.randomUUID()}`,
      status: "queued",
      serviceId: service.id,
      link,
      quantity,
      charge,
      currency: "USD",
      idempotencyKey,
    },
    { status: 201 },
  );
}
