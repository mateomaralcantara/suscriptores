import { json } from "@/lib/api";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return json({ success: true, orderId: id, refillId: `REF-${Date.now()}`, status: "pending", mode: "sandbox" }, { status: 202 }); }
