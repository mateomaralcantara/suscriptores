import Link from "next/link";
import { Brand } from "@/components/Brand";

const groups = [
  { label: "Operación", items: [["⌂", "Dashboard", "/dashboard"], ["◫", "Servicios", "/services"], ["＋", "Nuevo pedido", "/orders/new"], ["≡", "Pedidos", "/orders"], ["▦", "Pedidos masivos", "/orders/bulk"], ["$", "Agregar fondos", "/add-funds"], ["⇄", "Transacciones", "/transactions"]] },
  { label: "Crecimiento", items: [["?", "Tickets", "/tickets"], ["↗", "Afiliados", "/affiliates"], ["◇", "Paneles secundarios", "/child-panels"], ["{}", "API Docs", "/api-docs"]] },
  { label: "Sistema", items: [["⚙", "Configuración", "/settings"], ["◎", "Notificaciones", "/notifications"], ["◆", "Administración", "/admin"], ["i", "Centro de ayuda", "/help"]] },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <Brand />
      {groups.map((group) => (
        <div className="nav-group" key={group.label}>
          <div className="nav-label">{group.label}</div>
          {group.items.map(([icon, label, href]) => <Link className="side-link" href={href} key={href}><span className="side-icon">{icon}</span><span>{label}</span></Link>)}
        </div>
      ))}
    </aside>
  );
}
