import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { getCatalog, isSmmConfigured } from "@/lib/providers/smm-panel";
import { requireAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function load() {
  try {
    return await getCatalog();
  } catch (error) {
    console.error("[admin/services]", error);
    return null;
  }
}

export default async function AdminServicesPage() {
  await requireAdmin();
  if (!isSmmConfigured()) {
    return <><PageHeader title="Servicios" description="Proveedor no configurado." /><div className="notice">Configura al menos SMM_PANEL_API_URL y SMM_PANEL_API_KEY.</div></>;
  }
  const catalog = await load();
  if (!catalog) return <><PageHeader title="Servicios" description="Proveedores no disponibles." /><div className="notice">Ningún proveedor respondió.</div></>;

  return (
    <>
      <PageHeader title="Servicios" description={`${catalog.data.length} servicios de todos los proveedores (se muestran 1000).`} />
      {catalog.failed.length > 0 ? <div className="notice" style={{ marginBottom: 18 }}>Sin respuesta: {catalog.failed.join(", ")}. Sus servicios no se muestran ni se pueden pedir.</div> : null}
      <SimpleTable
        headers={["ID público", "Proveedor (ID)", "Servicio", "Categoría", "Coste / 1000", "Venta / 1000", "Rango", "Refill", "Cancelable"]}
        rows={catalog.data.slice(0, 1000).map((service) => [
          service.id,
          `${service.providerName} (${service.providerServiceId})`,
          service.name,
          service.category,
          `US$${service.providerRate.toFixed(4)}`,
          `US$${service.rate.toFixed(4)}`,
          `${service.min}-${service.max}`,
          service.refill ? "Sí" : "No",
          service.cancel ? "Sí" : "No",
        ])}
      />
    </>
  );
}
