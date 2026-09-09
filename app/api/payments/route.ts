import { json, safeBody } from "@/lib/api";
export async function GET() { return json({ mode: "sandbox", methods: ["stripe_test", "sandbox_card", "simulated_transfer", "admin_credit"] }); }
export async function POST(request: Request) { const body = await safeBody(request); return json({ success: true, paymentId: `PAY-DEMO-${Date.now()}`, status: "pending", amount: Number((body as { amount?: number }).amount ?? 100), mode: "sandbox" }, { status: 201 }); }
