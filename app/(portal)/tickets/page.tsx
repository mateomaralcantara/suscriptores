import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { getSessionProfile } from "@/lib/supabase-server";
import { listTicketsForProfile } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const { profile } = await getSessionProfile();
  const tickets = await listTicketsForProfile(profile.id);
  return (
    <>
      <PageHeader title="Soporte" description="Tus consultas con el equipo de soporte." action={<Link className="btn primary" href="/tickets/new">Nuevo ticket</Link>} />
      {tickets.length === 0 ? (
        <div className="card"><span className="muted">No tienes tickets. Si necesitas ayuda, crea uno nuevo.</span></div>
      ) : (
        <SimpleTable
          headers={["Ticket", "Asunto", "Categoría", "Prioridad", "Actualizado", "Estado"]}
          rows={tickets.map((ticket) => [
            <Link href={`/tickets/${ticket.public_id}`} key={ticket.id}>{ticket.public_id}</Link>,
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
