import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { tickets } from "@/lib/demo-data";
export default function TicketsPage() { return <><PageHeader title="Tickets de soporte" description="SLA, prioridades, categorías, agentes, archivos y seguimiento." action={<Link className="btn primary" href="/tickets/new">Nuevo ticket</Link>} /><SimpleTable headers={["Ticket", "Asunto", "Categoría", "Prioridad", "Actualizado", "Estado"]} rows={tickets.map((ticket) => [<Link href={`/tickets/${ticket.id}`} key={ticket.id}><strong>{ticket.id}</strong></Link>, ticket.subject, ticket.category, ticket.priority, ticket.updated, <StatusBadge status={ticket.status} key={ticket.id} />])} /></>; }
