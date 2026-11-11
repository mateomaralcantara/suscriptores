import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { money } from "@/lib/format";
import { microsToUsd } from "@/lib/money";
import { requireUser } from "@/lib/server/current-user";
import { getStore } from "@/lib/store";

export default async function DashboardPage() {
  const user = await requireUser();
  const store = getStore();
  const orders = store.listOrders(user);
  const ledger = store.listLedger(user);
  const active = orders.filter((order) => order.status === "queued" || order.status === "processing");
  const spentMicros = orders.filter((order) => order.status !== "canceled").reduce((sum, order) => sum + order.costMicros, 0);
  const completed = orders.filter((order) => order.status === "completed").length;

  return <>
    <PageHeader title="Dashboard" description={`Hola, ${user.name}. Este es el resumen de tu cuenta.`} action={<Link className="btn primary" href="/orders/new">＋ Nuevo pedido</Link>} />
    <div className="grid four">
      <StatCard label="Balance disponible" value={money(microsToUsd(store.balanceMicros(user.id)))} icon="$" />
      <StatCard label="Pedidos activos" value={String(active.length)} note={`${orders.length} en total`} icon="◫" />
      <StatCard label="Gasto total" value={money(microsToUsd(spentMicros))} note="Sin pedidos cancelados" icon="↘" />
      <StatCard label="Completados" value={String(completed)} icon="✓" />
    </div>
    <section style={{ marginTop: 18 }}>
      <div className="section-title"><div><h3>Últimos pedidos</h3><span className="muted">Los 7 más recientes</span></div><Link className="btn small" href="/orders">Ver todos</Link></div>
      {orders.length === 0 ? <div className="card muted">Aún no tienes pedidos. <Link href="/orders/new">Crea el primero</Link>.</div> : <SimpleTable headers={["Pedido", "Servicio", "Cantidad", "Costo", "Estado"]} rows={orders.slice(0, 7).map((order) => [<Link href={`/orders/${order.id}`} key="id"><strong>{order.id}</strong></Link>, order.serviceName, order.quantity, money(microsToUsd(order.costMicros)), <StatusBadge status={order.status} key="status" />])} />}
    </section>
    <section style={{ marginTop: 18 }}>
      <div className="section-title"><div><h3>Últimos movimientos</h3><span className="muted">Libro mayor de tu cartera</span></div><Link className="btn small" href="/transactions">Ver todos</Link></div>
      <SimpleTable headers={["Referencia", "Tipo", "Monto", "Saldo", "Fecha"]} rows={ledger.slice(0, 5).map((entry) => [entry.id, entry.type, money(microsToUsd(entry.amountMicros)), money(microsToUsd(entry.balanceAfterMicros)), entry.createdAt.slice(0, 16).replace("T", " ")])} />
    </section>
  </>;
}
