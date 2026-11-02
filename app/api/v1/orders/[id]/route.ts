import { orders } from "@/lib/demo-data";
import { apiError, json } from "@/lib/api";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = orders.find((item) => item.id === id);
  if (!order) return apiError(404, "Pedido no encontrado.");
  return json({ success: true, mode: "sandbox", data: order });
}
