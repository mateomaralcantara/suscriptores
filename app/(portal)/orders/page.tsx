import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { ensureProfileForUser, getCurrentUser, listOrdersForProfile } from "@/lib/supabase-server";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await ensureProfileForUser(user);
  const orders = await listOrdersForProfile(profile.id);

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Pedidos reales registrados en tu cuenta, con su costo y estado actual."
        action={<Link className="btn primary" href="/orders/new">Nuevo pedido</Link>}
      />
      {orders.length === 0 ? (
        <div className="card"><p className="muted">Todavía no tienes pedidos.</p><Link className="btn primary" href="/orders/new">Crear el primero</Link></div>
      ) : (
        <SimpleTable
          headers={["Pedido", "Servicio", "Objetivo", "Cantidad", "Costo", "Estado", "Fecha"]}
          rows={orders.map((order) => [
            <Link href={`/orders/${encodeURIComponent(order.public_id)}`} key={order.id}><strong>{order.public_id}</strong></Link>,
            String(order.metadata?.service_name ?? order.external_service_id ?? "Servicio"),
            order.target,
            order.quantity.toLocaleString(),
            money(order.cost_minor / 100),
            <StatusBadge status={order.status} key={`${order.id}-status`} />,
            new Date(order.created_at).toLocaleString("es-DO"),
          ])}
        />
      )}
    </>
  );
}
