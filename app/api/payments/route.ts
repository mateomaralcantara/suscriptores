import { apiError, json, safeBody } from "@/lib/api";

export async function GET() {
  return json({ mode: "sandbox", methods: ["stripe_test", "sandbox_card", "simulated_transfer", "admin_credit"] });
}

export async function POST(request: Request) {
  const body = await safeBody(request);
  const amount = body.amount === undefined ? 100 : Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    return apiError(422, "El monto debe ser un número entre 0 y 100000.", { amount: "Monto inválido." });
  }
  return json(
    { success: true, paymentId: `PAY-DEMO-${crypto.randomUUID()}`, status: "pending", amount: Math.round(amount * 100) / 100, mode: "sandbox" },
    { status: 201 },
  );
}
