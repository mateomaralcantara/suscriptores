import { json, safeBody } from "@/lib/api";
export async function POST(request: Request) { const payload = await safeBody(request); return json({ delivered: true, event: "order.completed", signature: "sha256=demo-signature", attempt: 1, payload, mode: "sandbox" }); }
