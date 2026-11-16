import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/supabase-server";
import { listAllTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status = "open" } = await searchParams;
  const tickets = await listAllTickets(status === "all" ? undefined : status);
  return (
    <>
      <PageHeader title="Tickets de soporte" description="Abiertos = esperan respuesta del equipo; pendientes = esperan al cliente." />
      <div className="form-actions" style={{ marginBottom: 12 }}>
        {[["open", "Abiertos"], ["pending", "Pendientes"], ["closed", "Cerrados"], ["all", "Todos"]].map(([value, label]) => (
          <Link className={`btn small${status === value ? " primary" : ""}`} href={`/admin/tickets?status=${value}`} key={value}>{label}</Link>
        ))}
      </div>
      {tickets.length === 0 ? (
        <div className="card"><span className="muted">No hay tickets en este estado.</span></div>
      ) : (
        <SimpleTable
          headers={["Ticket", "Cliente", "Asunto", "Categoría", "Prioridad", "Actualizado", "Estado"]}
          rows={tickets.map((ticket) => [
            <Link href={`/tickets/${ticket.public_id}`} key={ticket.id}>{ticket.public_id}</Link>,
            ticket.profiles?.email ?? "—",
            ticket.subject,
            ticket.category,
            ticket.priority,
            new Date(ticket.updated_at).toLocaleString("es-DO"),
            <StatusBadge key={`${ticket.id}-s`} status={ticket.status} />,
          ])}
        />
      )}
    </>
  );
}
