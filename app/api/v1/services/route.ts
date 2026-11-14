import { NextResponse } from "next/server";
import { buyerFromProfile, ensureAdminProfile, getUserFromRequest } from "@/lib/supabase-server";
import { byPriceAsc, priceForBuyer } from "@/lib/order-status";
import { getCatalog, getProviderBalances, getSmmProviders, smmLiveOrdersEnabled } from "@/lib/providers/smm-panel";
import { iconForPlatform, inferPlatform } from "@/lib/order-services";
import { getAverageCompletionMinutes } from "@/lib/service-stats";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });

  try {
    const [{ data }, averages, profile] = await Promise.all([
      getCatalog(),
      getAverageCompletionMinutes().catch((error) => {
        console.error("[v1/services] average times", error);
        return {} as Record<string, number>;
      }),
      ensureAdminProfile(user),
    ]);
    const buyer = buyerFromProfile(profile);
    const markups = Object.fromEntries(getSmmProviders().map((provider) => [provider.key, provider.markupPercent]));
    // The provider behind each service is internal: customers only see the public ID and sale price.
    const services = data
      .map((service) => {
      const platform = inferPlatform(`${service.category} ${service.name}`);
      return {
        id: service.id,
        platform,
        icon: iconForPlatform(platform),
        name: service.name,
        description: `${service.category} · ${service.type}`,
        category: service.category,
        type: service.type,
        rate: Number(priceForBuyer(service.providerRate, markups[service.providerKey] ?? 0, buyer).toFixed(6)),
        min: service.min,
        max: service.max,
        refill: service.refill,
        cancel: service.cancel,
        dripfeed: service.dripfeed,
        averageMinutes: averages[service.id] ?? null,
        providerAverageMinutes: service.providerAverageMinutes,
        startMinutes: service.startMinutes,
        dailySpeed: service.dailySpeed,
        // Provider identity is internal: only admins receive it.
        ...(buyer.isAdmin ? { providerKey: service.providerKey, providerName: service.providerName } : {}),
      };
      })
      .sort(byPriceAsc);

    return NextResponse.json({
      success: true,
      mode: "live",
      count: services.length,
      ordersEnabled: smmLiveOrdersEnabled(),
      pricing: buyer.isAdmin ? "admin" : buyer.discountPercent > 0 ? "discount" : "list",
      ...(buyer.isAdmin ? { providerBalances: await getProviderBalances().catch(() => []) } : {}),
      discountPercent: buyer.isAdmin ? 0 : buyer.discountPercent,
      services,
    });
  } catch (error) {
    console.error("[v1/services]", error);
    return NextResponse.json({ success: false, error: "El catálogo no está disponible en este momento. Inténtalo de nuevo." }, { status: 503 });
  }
}
