import { orders } from "@/lib/demo-data";
import { apiError, json } from "@/lib/api";
import { canRefill } from "@/lib/order-rules";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = orders.find((item) => item.id === id);
  if (!order) return apiError(404, "Pedido no encontrado.");
  if (!canRefill(order.status)) return apiError(409, `El pedido en estado "${order.status}" no admite refill.`);
  return json({ success: true, mode: "sandbox", orderId: id, refillId: `REF-${crypto.randomUUID()}`, status: "pending" }, { status: 202 });
}
