import Link from "next/link";
import { Brand } from "@/components/Brand";

const groups = [
  { label: "Operación", items: [["⌂", "Dashboard", "/dashboard"], ["◫", "Servicios", "/services"], ["＋", "Nuevo pedido", "/orders/new"], ["≡", "Pedidos", "/orders"], ["$", "Agregar fondos", "/add-funds"], ["⇄", "Transacciones", "/transactions"]] },
  { label: "Ayuda", items: [["?", "Soporte", "/tickets"], ["{}", "API", "/api-docs"], ["i", "Centro de ayuda", "/help"]] },
  { label: "Cuenta", items: [["⚙", "Mi cuenta", "/settings"], ["◆", "Administración", "/admin"]] },
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
