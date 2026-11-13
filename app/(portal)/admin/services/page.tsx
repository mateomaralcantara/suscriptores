import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { getSmmMarkupPercent, getSmmServices, isSmmConfigured } from "@/lib/providers/smm-panel";
import { applyMarkup } from "@/lib/order-status";
import { requireAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function load() {
  try {
    return { services: await getSmmServices() };
  } catch (error) {
    console.error("[admin/services]", error);
    return { error: "No fue posible consultar el catálogo del proveedor." };
  }
}

export default async function AdminServicesPage() {
  await requireAdmin();
  const markup = getSmmMarkupPercent();
  if (!isSmmConfigured()) return <><PageHeader title="Servicios" description="Proveedor no configurado." /><div className="notice">Configura SMM_PANEL_API_URL y SMM_PANEL_API_KEY.</div></>;
  const result = await load();
  if (!("services" in result) || !result.services) return <><PageHeader title="Servicios" description="Proveedor no disponible." /><div className="notice">{result.error}</div></>;
  return (
    <>
      <PageHeader title="Servicios" description={`${result.services.length} servicios del proveedor. Margen aplicado: ${markup}% (SMM_MARKUP_PERCENT).`} />
      <SimpleTable
        headers={["ID", "Servicio", "Categoría", "Coste / 1000", "Venta / 1000", "Rango", "Refill", "Cancelable"]}
        rows={result.services.slice(0, 500).map((service) => {
          const cost = Number(service.rate);
          return [
            String(service.service),
            service.name,
            service.category,
            `US$${Number.isFinite(cost) ? cost.toFixed(4) : "?"}`,
            `US$${Number.isFinite(cost) ? applyMarkup(cost, markup).toFixed(4) : "?"}`,
            `${service.min}-${service.max}`,
            service.refill ? "Sí" : "No",
            service.cancel ? "Sí" : "No",
          ];
        })}
      />
    </>
  );
}
