import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/OrderActions";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { isApiError } from "@/lib/errors";
import { money } from "@/lib/format";
import { microsToUsd } from "@/lib/money";
import { requireUser } from "@/lib/server/current-user";
import { getStore, type OrderView } from "@/lib/store";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  let order: OrderView;
  try {
    order = getStore().getOrder(user, id);
  } catch (error) {
    if (isApiError(error) && error.status === 404) notFound();
    throw error;
  }
  const rows: Array<[string, React.ReactNode]> = [
    ["Servicio", `${order.serviceId} · ${order.serviceName}`],
    ["Enlace", order.link],
    ["Cantidad", order.quantity],
    ["Costo", money(microsToUsd(order.costMicros))],
    ["Creado", order.createdAt.slice(0, 19).replace("T", " ")],
    ["Estado", <StatusBadge status={order.status} key="status" />],
  ];
  return <>
    <PageHeader title={order.id} description="Detalle del pedido y acciones disponibles." action={<Link className="btn" href="/orders">← Volver</Link>} />
    <div className="grid two">
      <section className="card"><h3>Información</h3><div className="list">{rows.map(([label, value]) => <div className="list-item" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
      <section className="card"><h3>Acciones</h3><p className="muted">Puedes cancelar mientras el pedido no esté completado; el importe vuelve a tu cartera. El refill se habilita al completarse{order.refillDays > 0 ? ` (${order.refillDays} días)` : " (no disponible en este servicio)"}.</p><OrderActions canCancel={order.status === "queued" || order.status === "processing"} canRefill={order.status === "completed" && order.refillDays > 0} orderId={order.id} /></section>
    </div>
  </>;
}
