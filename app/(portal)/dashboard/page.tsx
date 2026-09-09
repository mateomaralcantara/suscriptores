import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { MiniBars } from "@/components/MiniBars";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { orders, transactions } from "@/lib/demo-data";
import { money } from "@/lib/format";

export default function DashboardPage() {
  return <>
    <PageHeader title="Dashboard" description="Resumen financiero y operativo del entorno sandbox." action={<Link className="btn primary" href="/orders/new">＋ Nuevo pedido</Link>} />
    <div className="grid four">
      <StatCard label="Balance disponible" value="US$12,480.50" note="+8.2% este mes" icon="$" />
      <StatCard label="Balance reservado" value="US$1,245.20" note="184 pedidos activos" icon="◫" />
      <StatCard label="Gasto total" value="US$38,902.10" note="Datos de demostración" icon="↘" />
      <StatCard label="Comisiones" value="US$845.60" note="27 conversiones" icon="↗" />
    </div>
    <div className="grid two" style={{ marginTop: 18 }}>
      <section className="card"><div className="section-title"><div><h3>Volumen de pedidos</h3><span className="muted">Últimos 12 períodos</span></div><StatusBadge status="active" /></div><MiniBars /></section>
      <section className="card"><h3>Estado operativo</h3><div className="list"><div className="list-item"><span>Completados</span><strong>2,984</strong></div><div className="list-item"><span>Procesando</span><strong>126</strong></div><div className="list-item"><span>Parciales</span><strong>38</strong></div><div className="list-item"><span>Tasa de éxito</span><strong>98.4%</strong></div></div></section>
    </div>
    <section style={{ marginTop: 18 }}><div className="section-title"><div><h3>Últimos pedidos</h3><span className="muted">Seguimiento en tiempo real simulado</span></div><Link className="btn small" href="/orders">Ver todos</Link></div><SimpleTable headers={["Pedido", "Servicio", "Cantidad", "Costo", "Estado"]} rows={orders.slice(0, 7).map((order) => [<Link href={`/orders/${order.id}`} key={order.id}><strong>{order.id}</strong></Link>, order.service, order.quantity, money(order.cost), <StatusBadge status={order.status} key={order.status} />])} /></section>
    <section style={{ marginTop: 18 }}><div className="section-title"><div><h3>Últimas transacciones</h3><span className="muted">Libro mayor de demostración</span></div></div><SimpleTable headers={["Referencia", "Tipo", "Monto", "Fecha", "Estado"]} rows={transactions.slice(0, 5).map((tx) => [tx.id, tx.type, money(tx.amount), tx.date, <StatusBadge status={tx.status} key={tx.id} />])} /></section>
  </>;
}
