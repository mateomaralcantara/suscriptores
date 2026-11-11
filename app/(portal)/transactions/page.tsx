import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { money } from "@/lib/format";
import { microsToUsd } from "@/lib/money";
import { requireUser } from "@/lib/server/current-user";
import { getStore } from "@/lib/store";

const LABELS = { deposit: "Depósito", order: "Pedido", refund: "Reembolso" } as const;

export default async function TransactionsPage() {
  const user = await requireUser();
  const store = getStore();
  const ledger = store.listLedger(user);
  const total = (type: keyof typeof LABELS) => ledger.filter((entry) => entry.type === type).reduce((sum, entry) => sum + Math.abs(entry.amountMicros), 0);
  const cards: Array<[string, number]> = [["Disponible", store.balanceMicros(user.id)], ["Depósitos", total("deposit")], ["Pedidos", total("order")], ["Reembolsos", total("refund")]];
  return <>
    <PageHeader title="Transacciones" description={user.role === "admin" ? "Movimientos de todas las carteras." : "Movimientos de tu cartera: depósitos, pedidos y reembolsos."} />
    <div className="grid four" style={{ marginBottom: 18 }}>{cards.map(([label, micros]) => <div className="card" key={label}><span className="muted">{label}</span><h3>{money(microsToUsd(micros))}</h3></div>)}</div>
    <SimpleTable headers={["Referencia", "Tipo", "Monto", "Saldo posterior", "Origen", "Fecha"]} rows={ledger.map((entry) => [entry.id, LABELS[entry.type], money(microsToUsd(entry.amountMicros)), money(microsToUsd(entry.balanceAfterMicros)), entry.reference, entry.createdAt.slice(0, 16).replace("T", " ")])} />
  </>;
}
