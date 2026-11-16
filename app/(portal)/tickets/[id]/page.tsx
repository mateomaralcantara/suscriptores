import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TicketReply } from "@/components/TicketForms";
import { ensureAdminProfile, getSessionProfile, isAdminUser } from "@/lib/supabase-server";
import { getTicketForViewer } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getSessionProfile();
  const isStaff = isAdminUser(user);
  const profile = await ensureAdminProfile(user);
  const found = await getTicketForViewer(id, { profileId: profile.id, isStaff });
  if (!found) notFound();
  const { ticket, messages } = found;

  return (
    <>
      <PageHeader title={ticket.public_id} description={ticket.subject} action={<Link className="btn" href={isStaff ? "/admin/tickets" : "/tickets"}>← Tickets</Link>} />
      <div className="grid two">
        <section className="card">
          <h3>Conversación</h3>
          <div className="list" style={{ marginBottom: 16 }}>
            {messages.map((message) => {
              const fromStaff = message.author_id !== ticket.user_id;
              return (
                <div className="notice" key={message.id} style={message.internal ? { borderLeftColor: "var(--warning, orange)" } : undefined}>
                  <strong>{fromStaff ? "Soporte" : "Cliente"}{message.internal ? " · nota interna" : ""}</strong>
                  <small className="muted"> · {new Date(message.created_at).toLocaleString("es-DO")}</small>
                  <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{message.body}</div>
                </div>
              );
            })}
          </div>
          <TicketReply closed={ticket.status === "closed"} isStaff={isStaff} ticketId={ticket.public_id} />
        </section>
        <section className="card">
          <h3>Detalles</h3>
          <div className="list">
            <div className="list-item"><span>Estado</span><StatusBadge status={ticket.status} /></div>
            <div className="list-item"><span>Categoría</span><strong>{ticket.category}</strong></div>
            <div className="list-item"><span>Prioridad</span><strong>{ticket.priority}</strong></div>
            <div className="list-item"><span>Creado</span><strong>{new Date(ticket.created_at).toLocaleString("es-DO")}</strong></div>
          </div>
        </section>
      </div>
    </>
  );
}
