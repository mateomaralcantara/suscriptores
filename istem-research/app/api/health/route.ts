import { json } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export function GET() {
  return json({ ok: true, service: "istem-research", phase: 1, database: isSupabaseConfigured() ? "configurada" : "no_configurada" });
}
