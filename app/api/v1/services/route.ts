import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabase-server";
import { applySmmMarkup, getSmmServices, smmLiveOrdersEnabled } from "@/lib/providers/smm-panel";
import { iconForPlatform, inferPlatform } from "@/lib/order-services";
import { errorMessage } from "@/lib/api";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const providerServices = await getSmmServices();
    const services = providerServices
      .map((service) => {
        const providerRate = Number(service.rate);
        const min = Number(service.min);
        const max = Number(service.max);
        const platform = inferPlatform(`${service.category} ${service.name}`);
        return {
          id: String(service.service),
          platform,
          icon: iconForPlatform(platform),
          name: service.name,
          description: `${service.category} · ${service.type}`,
          category: service.category,
          type: service.type,
          rate: Number(applySmmMarkup(Number.isFinite(providerRate) ? providerRate : 0).toFixed(6)),
          min: Number.isFinite(min) ? min : 0,
          max: Number.isFinite(max) ? max : 0,
          refill: Boolean(service.refill),
          cancel: Boolean(service.cancel),
        };
      })
      .filter((service) => service.id && service.max >= service.min && service.max > 0);

    return NextResponse.json({
      success: true,
      mode: "live",
      count: services.length,
      ordersEnabled: smmLiveOrdersEnabled(),
      services,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: errorMessage(error) },
      { status: 503 },
    );
  }
}
