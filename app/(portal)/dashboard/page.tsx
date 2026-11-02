import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ensureProfileForUser,
  getCurrentUser,
  getWalletForProfile,
  listOrdersForProfile,
  listTransactionsForProfile,
} from "@/lib/supabase-server";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await ensureProfileForUser(user);
  const [wallet, orders, transactions] = await Promise.all([
    getWalletForProfile(profile.id),
    listOrdersForProfile(profile.id),
    listTransactionsForProfile(profile.id),
  ]);

  const completed = orders.filter((order) => order.status === "completed").length;
  const active = orders.filter((order) => ["pending_provider", "provider_unknown", "queued", "processing", "cancel_requested"].includes(order.status)).length;
  const spentMinor = transactions.filter((tx) => tx.type === "order" && tx.status === "completed").reduce((sum, tx) => sum + tx.amount_minor, 0);

  return (
    <>
      <PageHeader title="Dashboard" description={`Resumen operativo de ${profile.email}.`} action={<Link className="btn primary" href="/orders/new">＋ Nuevo pedido</Link>} />
      <div className="grid four">
        <StatCard label="Balance disponible" value={money((wallet?.available_minor ?? 0) / 100)} note="Saldo utilizable" icon="$" />
        <StatCard label="Balance reservado" value={money((wallet?.reserved_minor ?? 0) / 100)} note={`${active} pedidos activos`} icon="◫" />
        <StatCard label="Gasto total" value={money(spentMinor / 100)} note={`${orders.length} pedidos registrados`} icon="↘" />
        <StatCard label="Completados" value={completed.toLocaleString()} note="Pedidos finalizados" icon="✓" />
      </div>

      <section style={{ marginTop: 18 }}>
        <div className="section-title"><div><h3>Últimos pedidos</h3><span className="muted">Datos registrados en Supabase</span></div><Link className="btn small" href="/orders">Ver todos</Link></div>
        {orders.length === 0 ? <div className="card"><span className="muted">No hay pedidos todavía.</span></div> : (
          <SimpleTable
            headers={["Pedido", "Servicio", "Cantidad", "Costo", "Estado"]}
            rows={orders.slice(0, 7).map((order) => [
              <Link href={`/orders/${encodeURIComponent(order.public_id)}`} key={order.id}><strong>{order.public_id}</strong></Link>,
              String(order.metadata?.service_name ?? order.external_service_id ?? "Servicio"),
              order.quantity.toLocaleString(),
              money(order.cost_minor / 100),
              <StatusBadge status={order.status} key={`${order.id}-status`} />,
            ])}
          />
        )}
      </section>

      <section style={{ marginTop: 18 }}>
        <div className="section-title"><div><h3>Últimas transacciones</h3><span className="muted">Movimientos confirmados de tu cuenta</span></div><Link className="btn small" href="/transactions">Ver todas</Link></div>
        {transactions.length === 0 ? <div className="card"><span className="muted">No hay transacciones todavía.</span></div> : (
          <SimpleTable
            headers={["Referencia", "Tipo", "Monto", "Fecha", "Estado"]}
            rows={transactions.slice(0, 5).map((tx) => [
              tx.reference,
              tx.type,
              money(tx.amount_minor / 100),
              new Date(tx.created_at).toLocaleString("es-DO"),
              <StatusBadge status={tx.status} key={tx.id} />,
            ])}
          />
        )}
      </section>
    </>
  );
}
