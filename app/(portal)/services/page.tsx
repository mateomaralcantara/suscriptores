import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { getCatalog } from "@/lib/providers/smm-panel";
import { inferPlatform } from "@/lib/order-services";

export const dynamic = "force-dynamic";

async function loadServices() {
  try {
    const { data } = await getCatalog();
    return { services: data.map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category,
      platform: inferPlatform(`${service.category} ${service.name}`),
      rate: service.rate,
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
  const result = await loadServices();
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
}
