import { orders, services } from "@/lib/demo-data";
import { json, safeBody } from "@/lib/api";
export async function GET() { return json({ success: true, mode: "sandbox", total: orders.length, data: orders }); }
export async function POST(request: Request) {
  const body = await safeBody(request) as { serviceId?: string; target?: string; quantity?: number; idempotencyKey?: string };
  const service = services.find((item) => item.id === body.serviceId) ?? services[0];
  const quantity = Math.max(service.min, Math.min(service.max, Number(body.quantity ?? 100)));
  const cost = Number(((service.userPrice * quantity) / 100).toFixed(2));
  return json({ success: true, orderId: `ORD-DEMO-${Date.now()}`, status: "queued", cost, currency: "USD", mode: "sandbox", idempotencyKey: request.headers.get("Idempotency-Key") ?? body.idempotencyKey ?? null }, { status: 201 });
}
