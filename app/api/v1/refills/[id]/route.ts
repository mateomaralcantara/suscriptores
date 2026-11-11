import { authenticate, handle, json } from "@/lib/api";
import { getStore } from "@/lib/store";

export const GET = handle(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await authenticate(request);
  const { id } = await params;
  const refill = getStore().getRefill(user, id);
  return json({ success: true, data: { id: refill.id, orderId: refill.orderId, status: refill.status, createdAt: refill.createdAt } });
});
