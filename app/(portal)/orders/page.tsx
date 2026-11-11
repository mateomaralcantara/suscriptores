import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { money } from "@/lib/format";
import { microsToUsd } from "@/lib/money";
import { requireUser } from "@/lib/server/current-user";
import { getStore } from "@/lib/store";

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = getStore().listOrders(user);
  return <>
    <PageHeader title="Pedidos" description="Consulta estados, costos y acciones disponibles." action={<div className="nav-actions"><Link className="btn" href="/orders/bulk">Carga masiva</Link><Link className="btn primary" href="/orders/new">Nuevo pedido</Link></div>} />
    {orders.length === 0 ? <div className="card muted">Aún no tienes pedidos.</div> : <SimpleTable headers={["Pedido", "Servicio", "Enlace", "Cantidad", "Costo", "Fecha", "Estado"]} rows={orders.map((order) => [<Link href={`/orders/${order.id}`} key="id"><strong>{order.id}</strong></Link>, order.serviceName, order.link, order.quantity, money(microsToUsd(order.costMicros)), order.createdAt.slice(0, 16).replace("T", " "), <StatusBadge status={order.status} key="status" />])} />}
  </>;
}
