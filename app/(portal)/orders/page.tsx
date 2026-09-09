import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { orders } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default function OrdersPage() { return <><PageHeader title="Pedidos" description="Consulta estados, proveedores, costos y acciones disponibles." action={<div className="nav-actions"><Link className="btn" href="/orders/bulk">Carga masiva</Link><Link className="btn primary" href="/orders/new">Nuevo pedido</Link></div>} /><SimpleTable headers={["Pedido", "Servicio", "Objetivo", "Cantidad", "Costo", "Proveedor", "Estado"]} rows={orders.map((order) => [<Link href={`/orders/${order.id}`} key={order.id}><strong>{order.id}</strong></Link>, order.service, order.target, order.quantity, money(order.cost), order.provider, <StatusBadge status={order.status} key={order.id} />])} /></>; }
