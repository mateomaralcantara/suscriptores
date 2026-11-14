import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabase-server";
import { getCatalog, smmLiveOrdersEnabled } from "@/lib/providers/smm-panel";
import { iconForPlatform, inferPlatform } from "@/lib/order-services";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const { data } = await getCatalog();
    // The provider behind each service is internal: customers only see the public ID and sale price.
    const services = data.map((service) => {
      const platform = inferPlatform(`${service.category} ${service.name}`);
      return {
        id: service.id,
        platform,
        icon: iconForPlatform(platform),
        name: service.name,
        description: `${service.category} · ${service.type}`,
        category: service.category,
        type: service.type,
        rate: service.rate,
        min: service.min,
        max: service.max,
        refill: service.refill,
        cancel: service.cancel,
        dripfeed: service.dripfeed,
      };
    });

    return NextResponse.json({ success: true, mode: "live", count: services.length, ordersEnabled: smmLiveOrdersEnabled(), services });
  } catch (error) {
    console.error("[v1/services]", error);
    return NextResponse.json({ success: false, error: "El catálogo no está disponible en este momento. Inténtalo de nuevo." }, { status: 503 });
  }
}
