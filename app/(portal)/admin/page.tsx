import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { isSmmConfigured, smmLiveOrdersEnabled } from "@/lib/providers/smm-panel";

const modules = [
  ["Usuarios", "/admin/users"],
  ["Servicios", "/admin/services"],
  ["Proveedores", "/admin/providers"],
  ["Pedidos", "/admin/orders"],
  ["Pagos", "/admin/payments"],
  ["Transacciones", "/admin/transactions"],
  ["Tickets", "/admin/tickets"],
  ["Afiliados", "/admin/affiliates"],
  ["Paneles secundarios", "/admin/child-panels"],
  ["Auditoría", "/admin/audit"],
  ["Configuración", "/admin/settings"],
];

export default function AdminPage() {
  return (
    <>
      <PageHeader title="Administración" description="Control de la configuración y operación de la plataforma." />
      <div className="grid two">
        <section className="card">
          <h3>Estado del núcleo</h3>
          <div className="list">
            <div className="list-item"><span>Proveedor SMM configurado</span><strong>{isSmmConfigured() ? "Sí" : "No"}</strong></div>
            <div className="list-item"><span>Pedidos reales habilitados</span><strong>{smmLiveOrdersEnabled() ? "Sí" : "No"}</strong></div>
            <div className="list-item"><span>Autenticación</span><strong>Supabase</strong></div>
            <div className="list-item"><span>Persistencia</span><strong>Supabase / PostgreSQL</strong></div>
          </div>
        </section>
        <section className="card">
          <h3>Módulos administrativos</h3>
          <div className="list">{modules.map(([label, href]) => <Link className="list-item" href={href} key={href}><span>{label}</span><strong>→</strong></Link>)}</div>
        </section>
      </div>
    </>
  );
}
