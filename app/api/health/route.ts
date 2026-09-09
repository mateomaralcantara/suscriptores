import { json } from "@/lib/api";
export async function GET() { return json({ ok: true, service: "growth-reseller-lab", mode: "sandbox", timestamp: new Date().toISOString() }); }
