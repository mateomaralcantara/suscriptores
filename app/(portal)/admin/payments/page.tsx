import { AdminEntityPage } from "@/components/AdminEntityPage";
import { StatusBadge } from "@/components/StatusBadge";
import { transactions } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default function Page() { return <AdminEntityPage title="Pagos" description="Stripe Test Mode, transferencias simuladas, cupones, bonos y comprobantes." headers={["Pago","Método","Monto","Fecha","Estado"]} rows={transactions.slice(0,12).map((t) => [t.id,t.type,money(t.amount),t.date,<StatusBadge status={t.status} key={t.id} />])} stats={[["Aprobados","US$18,420"],["Pendientes","US$1,285"],["Bonos","US$740"],["Rechazados","18"]]} />; }
