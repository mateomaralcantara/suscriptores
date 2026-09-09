import { json, safeBody } from "@/lib/api";
export async function POST(request: Request) { const body = await safeBody(request) as { orders?: unknown[] }; const count = Math.min(Array.isArray(body.orders) ? body.orders.length : 0, 10000); return json({ success: true, batchId: `BULK-DEMO-${Date.now()}`, accepted: count, rejected: 0, status: "queued", mode: "sandbox" }, { status: 202 }); }
