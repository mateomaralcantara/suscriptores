import Link from "next/link";
import { ResolveOrderForm } from "@/components/AdminForms";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { money } from "@/lib/format";
import { requireAdmin, serviceRoleRest } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type Row = {
  id: string; public_id: string; status: string; quantity: number; cost_minor: number; target: string;
  created_at: string; provider_order_id: string | null; external_service_id: string | null;
  metadata: { service_name?: string; provider_error?: string } | null; profiles: { email: string } | null;
};

const SELECT = "id,public_id,status,quantity,cost_minor,target,created_at,provider_order_id,external_service_id,metadata,profiles(email)";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = status && /^[a-z_]+$/.test(status) ? `&status=eq.${status}` : "";
  const [unknown, orders] = await Promise.all([
    serviceRoleRest<Row[]>(`orders?select=${SELECT}&status=eq.provider_unknown&order=created_at.asc&limit=100`),
    serviceRoleRest<Row[]>(`orders?select=${SELECT}${filter}&order=created_at.desc&limit=200`),
  ]);

  return (
    <>
      <PageHeader title="Pedidos" description="Todos los pedidos de la plataforma (200 más recientes)." />
      <section className="card" style={{ marginBottom: 18 }}>
        <h3>Pendientes de conciliar ({unknown.length})</h3>
        <span className="muted">
          El proveedor no confirmó si estos pedidos se crearon; el saldo del cliente sigue reservado. Búscalos en el panel del proveedor por
          enlace y fecha: si existen, confirma con su ID; si no, devuelve el saldo.
        </span>
        {unknown.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <SimpleTable
              headers={["Pedido", "Cliente", "Servicio", "Enlace", "Cantidad", "Coste", "Fecha", "Acción"]}
              rows={unknown.map((order) => [
                order.public_id,
                order.profiles?.email ?? "—",
                `${order.external_service_id ?? ""} ${order.metadata?.service_name ?? ""}`.trim(),
                order.target,
                order.quantity.toLocaleString(),
                money(order.cost_minor / 100),
                new Date(order.created_at).toLocaleString("es-DO"),
                <ResolveOrderForm key={order.id} orderId={order.id} />,
              ])}
            />
          </div>
        ) : null}
      </section>
      <div className="form-actions" style={{ marginBottom: 12 }}>
        {["", "queued", "processing", "completed", "partial", "canceled", "failed"].map((value) => (
          <Link className={`btn small${(status ?? "") === value ? " primary" : ""}`} href={value ? `/admin/orders?status=${value}` : "/admin/orders"} key={value}>
            {value || "Todos"}
          </Link>
        ))}
      </div>
      <SimpleTable
        headers={["Pedido", "Cliente", "Servicio", "Cantidad", "Coste", "Proveedor", "Fecha", "Estado"]}
        rows={orders.map((order) => [
          order.public_id,
          order.profiles?.email ?? "—",
          order.metadata?.service_name ?? order.external_service_id ?? "—",
          order.quantity.toLocaleString(),
          money(order.cost_minor / 100),
          order.provider_order_id ?? "—",
          new Date(order.created_at).toLocaleString("es-DO"),
          <StatusBadge key={order.id} status={order.status} />,
        ])}
      />
    </>
  );
}
