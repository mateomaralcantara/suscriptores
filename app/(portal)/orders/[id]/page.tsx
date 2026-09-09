import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { orders } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const order = orders.find((item) => item.id === id) ?? orders[0]; if (!order) notFound();
  return <><PageHeader title={order.id} description="Detalle completo, eventos y acciones sandbox del pedido." action={<Link className="btn" href="/orders">← Volver</Link>} /><div className="grid two"><section className="card"><h3>Información</h3><div className="list"><div className="list-item"><span>Servicio</span><strong>{order.service}</strong></div><div className="list-item"><span>Objetivo</span><strong>{order.target}</strong></div><div className="list-item"><span>Cantidad</span><strong>{order.quantity}</strong></div><div className="list-item"><span>Costo</span><strong>{money(order.cost)}</strong></div><div className="list-item"><span>Estado</span><StatusBadge status={order.status} /></div></div></section><section className="card"><h3>Línea de tiempo</h3><div className="list"><div className="list-item"><span>Draft</span><strong>09:10</strong></div><div className="list-item"><span>Validated</span><strong>09:11</strong></div><div className="list-item"><span>Queued</span><strong>09:11</strong></div><div className="list-item"><span>{order.status}</span><strong>10:24</strong></div></div><div className="form-actions"><button className="btn danger" type="button">Solicitar cancelación</button><button className="btn" type="button">Solicitar refill</button></div></section></div></>;
}
