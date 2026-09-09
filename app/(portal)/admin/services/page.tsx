import { AdminEntityPage } from "@/components/AdminEntityPage";
import { StatusBadge } from "@/components/StatusBadge";
import { services } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default function Page() { return <AdminEntityPage title="Servicios" description="Catálogo, categorías, precios, márgenes, mapping y sincronización." headers={["ID","Servicio","Categoría","Base","Venta","Proveedor","Estado"]} rows={services.slice(0,30).map((s) => [s.id,s.name,s.category,money(s.basePrice),money(s.userPrice),s.providerId,<StatusBadge status={s.status} key={s.id} />])} stats={[["Activos","94"],["Inactivos","6"],["Categorías","12"],["Margen medio","42%"]]} />; }
