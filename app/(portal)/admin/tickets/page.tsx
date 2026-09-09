import { AdminEntityPage } from "@/components/AdminEntityPage";
import { StatusBadge } from "@/components/StatusBadge";
import { tickets } from "@/lib/demo-data";
export default function Page() { return <AdminEntityPage title="Soporte" description="Colas, SLA, agentes, prioridades, etiquetas y respuestas internas." headers={["Ticket","Asunto","Categoría","Prioridad","Actualizado","Estado"]} rows={tickets.map((t) => [t.id,t.subject,t.category,t.priority,t.updated,<StatusBadge status={t.status} key={t.id} />])} stats={[["Abiertos","23"],["Alta prioridad","4"],["SLA cumplido","96%"],["Satisfacción","4.8/5"]]} />; }
