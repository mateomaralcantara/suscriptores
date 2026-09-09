import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { transactions } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default function TransactionsPage() { return <><PageHeader title="Transacciones" description="Movimientos de balance, reservas, bonos, comisiones y reembolsos." /><div className="grid four" style={{ marginBottom: 18 }}><div className="card"><span className="muted">Disponible</span><h3>US$12,480.50</h3></div><div className="card"><span className="muted">Reservado</span><h3>US$1,245.20</h3></div><div className="card"><span className="muted">Bonos</span><h3>US$420.00</h3></div><div className="card"><span className="muted">Reembolsos</span><h3>US$318.40</h3></div></div><SimpleTable headers={["Referencia", "Tipo", "Monto", "Fecha", "Estado"]} rows={transactions.map((tx) => [tx.id, tx.type, money(tx.amount), tx.date, <StatusBadge status={tx.status} key={tx.id} />])} /></>; }
