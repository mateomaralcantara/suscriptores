import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { getCatalog, getProviderBalance, getSmmProviders, smmLiveOrdersEnabled } from "@/lib/providers/smm-panel";
import { requireAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function providerRows() {
  const providers = getSmmProviders();
  const [balances, catalog] = await Promise.all([
    Promise.allSettled(providers.map((provider) => getProviderBalance(provider))),
    getCatalog().catch((error) => {
      console.error("[admin/providers] catalog", error);
      return null;
    }),
  ]);
  return providers.map((provider, index) => {
    const balance = balances[index];
    const services = catalog?.data.filter((service) => service.providerKey === provider.key).length ?? 0;
    const down = balance.status === "rejected" || catalog?.failed.includes(provider.name);
    if (balance.status === "rejected") console.error(`[admin/providers] ${provider.name} balance`, balance.reason);
    return {
      provider,
      balance: balance.status === "fulfilled" ? `${balance.value.currency} ${balance.value.balance}` : "—",
      services,
      status: down ? "Sin respuesta" : "Conectado",
    };
  });
}

export default async function ProvidersPage() {
  await requireAdmin();
  const providers = getSmmProviders();
  if (providers.length === 0) {
    return (
      <>
        <PageHeader title="Proveedores" description="Configuración de proveedores externos." />
        <div className="notice">No hay proveedores configurados. Define SMM_PANEL_API_URL y SMM_PANEL_API_KEY en el entorno del servidor.</div>
      </>
    );
  }

  const rows = await providerRows();
  return (
    <>
      <PageHeader title="Proveedores" description={`${providers.length} proveedor(es). Pedidos reales: ${smmLiveOrdersEnabled() ? "ACTIVOS" : "BLOQUEADOS"}.`} />
      <SimpleTable
        headers={["Proveedor", "Rango de IDs", "Margen", "Servicios", "Saldo en el proveedor", "Estado"]}
        rows={rows.map((row) => [
          row.provider.name,
          row.provider.offset === 0 ? "IDs originales" : `${row.provider.offset.toLocaleString()} + ID`,
          `${row.provider.markupPercent}%`,
          row.services.toLocaleString(),
          row.balance,
          row.status,
        ])}
      />
      <div className="notice" style={{ marginTop: 18 }}>
        Los pedidos de tus clientes se pagan con el saldo de cada proveedor: recárgalo antes de que se agote o sus pedidos fallarán
        (el cliente recupera su dinero automáticamente). Las claves de los proveedores nunca se muestran aquí.
      </div>
    </>
  );
}
