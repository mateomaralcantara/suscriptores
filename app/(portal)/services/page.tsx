import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { applySmmMarkup, getSmmServices } from "@/lib/providers/smm-panel";
import { inferPlatform } from "@/lib/order-services";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  try {
    const raw = await getSmmServices();
    const services = raw.map((service) => {
      const providerRate = Number(service.rate);
      const rate = applySmmMarkup(Number.isFinite(providerRate) ? providerRate : 0);
      return {
        id: String(service.service),
        name: service.name,
        category: service.category,
        platform: inferPlatform(`${service.category} ${service.name}`),
        rate,
        min: Number(service.min),
        max: Number(service.max),
        refill: Boolean(service.refill),
        cancel: Boolean(service.cancel),
      };
    });

    const categories = Array.from(new Set(services.map((service) => service.category))).slice(0, 4);
    return (
      <>
        <PageHeader
          title="Catálogo de servicios"
          description={`${services.length} servicios cargados desde el proveedor conectado. Los precios incluyen el margen configurado.`}
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible cargar el catálogo.";
    return (
      <>
        <PageHeader title="Catálogo de servicios" description="Proveedor no disponible." />
        <div className="notice">{message}</div>
      </>
    );
  }
}
