import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderActions } from "@/components/OrderActions";
import { ensureProfileForUser, getCurrentUser, getOrderForProfile } from "@/lib/supabase-server";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const profile = await ensureProfileForUser(user);
  const order = await getOrderForProfile(profile.id, id);
  if (!order) notFound();

  const serviceName = String(order.metadata?.service_name ?? order.external_service_id ?? "Servicio");
  const canCancel = Boolean(order.provider_order_id) && !["completed", "canceled", "failed"].includes(order.status);
  const canRefill = Boolean(order.provider_order_id) && ["completed", "partial"].includes(order.status);

  return (
    <>
      <PageHeader title={order.public_id} description="Detalle del pedido registrado en tu cuenta." action={<Link className="btn" href="/orders">← Volver</Link>} />
      <div className="grid two">
        <section className="card">
          <h3>Información</h3>
          <div className="list">
            <div className="list-item"><span>Servicio</span><strong>{serviceName}</strong></div>
            <div className="list-item"><span>ID del servicio</span><strong>{order.external_service_id ?? "-"}</strong></div>
            <div className="list-item"><span>Objetivo</span><strong>{order.target}</strong></div>
            <div className="list-item"><span>Cantidad</span><strong>{order.quantity.toLocaleString()}</strong></div>
            <div className="list-item"><span>Costo</span><strong>{money(order.cost_minor / 100)}</strong></div>
            <div className="list-item"><span>Estado</span><StatusBadge status={order.status} /></div>
            <div className="list-item"><span>Proveedor</span><strong>{order.provider_order_id ? `#${order.provider_order_id}` : "Pendiente de confirmación"}</strong></div>
          </div>
        </section>
        <section className="card">
          <h3>Seguimiento</h3>
          <div className="list">
            <div className="list-item"><span>Creado</span><strong>{new Date(order.created_at).toLocaleString("es-DO")}</strong></div>
            <div className="list-item"><span>Última actualización</span><strong>{new Date(order.updated_at).toLocaleString("es-DO")}</strong></div>
            <div className="list-item"><span>Estado actual</span><StatusBadge status={order.status} /></div>
          </div>
          <OrderActions orderId={order.public_id} canCancel={canCancel} canRefill={canRefill} />
        </section>
      </div>
    </>
  );
}
