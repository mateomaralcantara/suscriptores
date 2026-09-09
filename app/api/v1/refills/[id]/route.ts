import { json } from "@/lib/api";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return json({ success: true, refillId: id, status: "processing", mode: "sandbox" }); }
