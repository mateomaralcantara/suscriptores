import { orders } from "@/lib/demo-data";
import { apiError, json } from "@/lib/api";
import { canCancel } from "@/lib/order-rules";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = orders.find((item) => item.id === id);
  if (!order) return apiError(404, "Pedido no encontrado.");
  if (!canCancel(order.status)) return apiError(409, `No se puede cancelar un pedido en estado "${order.status}".`);
  return json({ success: true, mode: "sandbox", orderId: id, requestId: `CAN-${crypto.randomUUID()}`, status: "pending" }, { status: 202 });
}
