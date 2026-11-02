import { json } from "@/lib/api";
import { orderServices } from "@/lib/order-services";

export async function GET() {
  return json({ success: true, mode: "sandbox", count: orderServices.length, services: orderServices });
}
