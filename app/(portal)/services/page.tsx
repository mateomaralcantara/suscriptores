import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { getCatalog, getSmmProviders } from "@/lib/providers/smm-panel";
import { priceForBuyer, type Buyer } from "@/lib/order-status";
import { buyerFromProfile, ensureAdminProfile, getSessionProfile } from "@/lib/supabase-server";
import { inferPlatform } from "@/lib/order-services";

export const dynamic = "force-dynamic";

async function loadServices(buyer: Buyer) {
  try {
    const { data } = await getCatalog();
    const markups = Object.fromEntries(getSmmProviders().map((provider) => [provider.key, provider.markupPercent]));
    return { services: data.map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      platform: inferPlatform(`${service.category} ${service.name}`),
      rate: priceForBuyer(service.providerRate, markups[service.providerKey] ?? 0, buyer),
      min: service.min,
      max: service.max,
      refill: service.refill,
      cancel: service.cancel,
    })) };
  } catch (error) {
    console.error("[services] provider error", error);
    return { error: "No fue posible cargar el catálogo del proveedor. Inténtalo de nuevo en unos minutos." };
  }
}

export default async function ServicesPage() {
  const { user } = await getSessionProfile();
  const buyer = buyerFromProfile(await ensureAdminProfile(user));
  const result = await loadServices(buyer);
  if (!("services" in result) || !result.services) {
    return (
      <>
        <PageHeader title="Catálogo de servicios" description="Proveedor no disponible." />
        <div className="notice">{result.error}</div>
      </>
    );
  }
  const { services } = result;

  const categories = Array.from(new Set(services.map((service) => service.category))).slice(0, 4);
  return (
      <>
        <PageHeader
          title="Catálogo de servicios"
          description={`${services.length} servicios disponibles. ${buyer.isAdmin ? "Como administrador ves y pagas el precio de coste del proveedor." : buyer.discountPercent > 0 ? `Precios con tu descuento del ${buyer.discountPercent}%.` : "Precios por cada 1000 unidades."}`}
          action={<Link className="btn primary" href="/orders/new">Crear pedido</Link>}
        />
        <div className="grid four" style={{ marginBottom: 18 }}>
          {categories.map((category) => (
            <article className="card" key={category}>
              <span className="muted">Categoría</span>
              <h3>{category}</h3>
              <strong>{services.filter((service) => service.category === category).length} servicios</strong>
            </article>
          ))}
        </div>
        <SimpleTable
          headers={["ID", "Servicio", "Plataforma", "Categoría", "Precio / 1000", "Rango", "Opciones"]}
          rows={services.slice(0, 250).map((service) => [
            service.id,
            service.name,
            service.platform,
            service.category,
            `US$${service.rate.toFixed(4)}`,
            `${service.min.toLocaleString()}-${service.max.toLocaleString()}`,
            `${service.refill ? "Refill" : "Sin refill"} · ${service.cancel ? "Cancelable" : "No cancelable"}`,
          ])}
        />
      </>
    );
}
