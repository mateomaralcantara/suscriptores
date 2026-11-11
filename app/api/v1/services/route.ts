import { json } from "@/lib/api";
import { orderServices } from "@/lib/order-services";

/** The catalog is public: it contains no account data. */
export async function GET() {
  return json({ success: true, count: orderServices.length, services: orderServices }, { headers: { "cache-control": "public, max-age=60" } });
}
