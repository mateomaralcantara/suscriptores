import { json } from "@/lib/api";
import { getSmmProviders, isSmmConfigured, smmLiveOrdersEnabled } from "@/lib/providers/smm-panel";
import { isSupabaseConfigured } from "@/lib/supabase-server";

export async function GET() {
  return json({
    ok: true,
    service: "suscriptores",
    mode: "live-core",
    dependencies: {
      supabase: isSupabaseConfigured(),
      smmProvider: isSmmConfigured(),
      smmProviders: getSmmProviders().length,
      liveOrders: smmLiveOrdersEnabled(),
    },
    timestamp: new Date().toISOString(),
  });
}
