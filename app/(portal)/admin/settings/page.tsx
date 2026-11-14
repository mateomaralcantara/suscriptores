import { PageHeader } from "@/components/PageHeader";
import { getSmmMarkupPercent, getSmmProviders, smmLiveOrdersEnabled } from "@/lib/providers/smm-panel";
import { isStripeConfigured } from "@/lib/stripe";
import { isSupabaseConfigured, requireAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const items: [string, string, string][] = [
    ["Supabase", isSupabaseConfigured() ? "Configurado" : "Falta", "SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"],
    ["Proveedores SMM", getSmmProviders().map((p) => p.name).join(", ") || "Falta", "SMM_PANEL_API_URL/KEY (principal) y SMM_PROVIDER_2..5_NAME/API_URL/API_KEY"],
    ["Pedidos reales", smmLiveOrdersEnabled() ? "Activos" : "Bloqueados", "SMM_LIVE_ORDERS_ENABLED"],
    ["Margen", `${getSmmMarkupPercent()}%`, "SMM_MARKUP_PERCENT"],
    ["Pagos con tarjeta", isStripeConfigured() ? "Configurado" : "Falta", "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET"],
    ["Sincronización automática", process.env.CRON_SECRET ? "Configurada" : "Falta", "CRON_SECRET (+ secretos APP_URL y CRON_SECRET en GitHub)"],
    ["Administradores", `${(process.env.ADMIN_EMAILS ?? "").split(",").filter((item) => item.trim()).length} correos`, "ADMIN_EMAILS"],
  ];
  return (
    <>
      <PageHeader title="Configuración" description="Estado de la configuración del servidor. Los valores secretos nunca se muestran." />
      <div className="card">
        <div className="list">
          {items.map(([label, value, vars]) => (
            <div className="list-item" key={label}>
              <span>{label}<br /><small className="muted">{vars}</small></span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 14 }}>Estos valores se cambian en las variables de entorno del servidor y requieren reiniciar la aplicación.</p>
      </div>
    </>
  );
}
