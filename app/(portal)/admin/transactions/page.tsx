import { AdminEntityPage } from "@/components/AdminEntityPage";
import { StatusBadge } from "@/components/StatusBadge";
import { transactions } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default function Page() { return <AdminEntityPage title="Libro mayor" description="Entradas contables verificables, reservas, liberaciones y reembolsos." headers={["Referencia","Tipo","Monto","Fecha","Estado"]} rows={transactions.map((t) => [t.id,t.type,money(t.amount),t.date,<StatusBadge status={t.status} key={t.id} />])} stats={[["Débitos","US$38,902"],["Créditos","US$52,188"],["Reservado","US$1,245"],["Diferencia","US$12,041"]]} />; }
