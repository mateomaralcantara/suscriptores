import { PageHeader } from "@/components/PageHeader";
import { getSmmBalance, getSmmServices, isSmmConfigured, smmLiveOrdersEnabled } from "@/lib/providers/smm-panel";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  if (!isSmmConfigured()) {
    return (
      <>
        <PageHeader title="Proveedores" description="Configuración del proveedor externo." />
        <div className="notice">Faltan SMM_PANEL_API_URL y/o SMM_PANEL_API_KEY en el entorno del servidor.</div>
      </>
    );
  }

  try {
    const [balance, services] = await Promise.all([getSmmBalance(), getSmmServices()]);
    return (
      <>
        <PageHeader title="Proveedores" description="Estado en tiempo real del proveedor conectado." />
        <div className="grid four">
          <div className="card"><span className="muted">Proveedor</span><h3>SMM Panel</h3></div>
          <div className="card"><span className="muted">Balance proveedor</span><h3>{balance.currency} {balance.balance}</h3></div>
          <div className="card"><span className="muted">Servicios</span><h3>{services.length.toLocaleString()}</h3></div>
          <div className="card"><span className="muted">Pedidos reales</span><h3>{smmLiveOrdersEnabled() ? "ACTIVOS" : "BLOQUEADOS"}</h3></div>
        </div>
        <div className="notice" style={{ marginTop: 18 }}>La clave privada del proveedor permanece únicamente en variables de entorno del servidor y nunca se muestra en esta página.</div>
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Proveedores" description="No fue posible consultar el proveedor." />
        <div className="notice">{error instanceof Error ? error.message : "Error de proveedor."}</div>
      </>
    );
  }
}
