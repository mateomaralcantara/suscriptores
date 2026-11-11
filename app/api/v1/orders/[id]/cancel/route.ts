import { authenticate, handle, json } from "@/lib/api";
import { getStore } from "@/lib/store";
import { orderJson } from "@/lib/views";

export const POST = handle(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await authenticate(request);
  const { id } = await params;
  return json({ success: true, data: orderJson(getStore().cancelOrder(user, id)) });
});
