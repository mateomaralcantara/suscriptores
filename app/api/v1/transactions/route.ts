import { transactions } from "@/lib/demo-data";
import { json } from "@/lib/api";
export async function GET() { return json({ success: true, mode: "sandbox", total: transactions.length, data: transactions }); }
