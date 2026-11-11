import { json } from "@/lib/api";
import { isDemoMode } from "@/lib/config";

export async function GET() {
  return json({ ok: true, service: "growth-reseller-lab", mode: isDemoMode() ? "sandbox" : "live", timestamp: new Date().toISOString() });
}
