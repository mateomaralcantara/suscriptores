import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { isSmmConfigured, smmLiveOrdersEnabled } from "@/lib/providers/smm-panel";

const modules = [
  ["Usuarios y saldos", "/admin/users"],
  ["Pedidos y conciliación", "/admin/orders"],
  ["Libro de movimientos", "/admin/transactions"],
  ["Pagos (recargas)", "/admin/payments"],
  ["Tickets de soporte", "/admin/tickets"],
  ["Servicios y margen", "/admin/services"],
  ["Proveedor", "/admin/providers"],
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
