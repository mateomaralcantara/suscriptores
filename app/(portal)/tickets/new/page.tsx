import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { NewTicketForm } from "@/components/TicketForms";

export default function NewTicketPage() {
  return (
    <>
      <PageHeader title="Nuevo ticket" description="Cuéntanos qué ocurre; te responderemos en este mismo hilo." action={<Link className="btn" href="/tickets">← Tickets</Link>} />
      <NewTicketForm />
    </>
  );
}
