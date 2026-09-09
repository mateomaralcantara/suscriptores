import { PageHeader } from "@/components/PageHeader";
import { SandboxForm } from "@/components/SandboxForm";
export default function NewTicketPage() { return <><PageHeader title="Nuevo ticket" description="Crea una solicitud de soporte y asigna prioridad y categoría." /><SandboxForm kind="ticket" /></>; }
