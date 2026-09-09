import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ensureProfileForUser,
  getCurrentUser,
  getWalletForProfile,
  listTransactionsForProfile,
} from "@/lib/supabase-server";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await ensureProfileForUser(user);
  const [wallet, transactions] = await Promise.all([
    getWalletForProfile(profile.id),
    listTransactionsForProfile(profile.id),
  ]);

  const deposits = transactions.filter((tx) => tx.type === "deposit" && tx.status === "completed").reduce((sum, tx) => sum + tx.amount_minor, 0);
  const orders = transactions.filter((tx) => tx.type === "order" && tx.status === "completed").reduce((sum, tx) => sum + tx.amount_minor, 0);

  return (
    <>
      <PageHeader title="Transacciones" description="Movimientos registrados en tu cuenta y estado actual del balance." />
      <div className="grid four" style={{ marginBottom: 18 }}>
        <div className="card"><span className="muted">Disponible</span><h3>{money((wallet?.available_minor ?? 0) / 100)}</h3></div>
        <div className="card"><span className="muted">Reservado</span><h3>{money((wallet?.reserved_minor ?? 0) / 100)}</h3></div>
        <div className="card"><span className="muted">Depósitos confirmados</span><h3>{money(deposits / 100)}</h3></div>
        <div className="card"><span className="muted">Consumido en pedidos</span><h3>{money(orders / 100)}</h3></div>
      </div>
      {transactions.length === 0 ? (
        <div className="card"><span className="muted">No hay transacciones registradas.</span></div>
      ) : (
        <SimpleTable
          headers={["Referencia", "Tipo", "Monto", "Fecha", "Estado"]}
          rows={transactions.map((tx) => [
            tx.reference,
            tx.type,
            money(tx.amount_minor / 100),
            new Date(tx.created_at).toLocaleString("es-DO"),
            <StatusBadge status={tx.status} key={tx.id} />,
          ])}
        />
      )}
    </>
  );
}
