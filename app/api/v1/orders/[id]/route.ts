import { orders } from "@/lib/demo-data";
import { json } from "@/lib/api";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const order = orders.find((item) => item.id === id) ?? { ...orders[0], id }; return json({ success: true, mode: "sandbox", data: order }); }
