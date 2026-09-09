import { AdminEntityPage } from "@/components/AdminEntityPage";
import { StatusBadge } from "@/components/StatusBadge";
import { orders } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default function Page() { return <AdminEntityPage title="Pedidos administrativos" description="Revisión global, reintentos, cancelaciones, refill y eventos." headers={["ID","Servicio","Cantidad","Costo","Proveedor","Estado"]} rows={orders.map((o) => [o.id,o.service,o.quantity,money(o.cost),o.provider,<StatusBadge status={o.status} key={o.id} />])} stats={[["Totales","3,482"],["Hoy","384"],["En cola","126"],["Fallidos","19"]]} />; }
