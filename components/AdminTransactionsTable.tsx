import { SimpleTable } from "@/components/SimpleTable";
import { money } from "@/lib/format";
import { serviceRoleRest } from "@/lib/supabase-server";

type Row = { id: string; reference: string; type: string; amount_minor: number; created_at: string; metadata: { reason?: string } | null; profiles: { email: string } | null };
const LABELS: Record<string, string> = { topup: "Recarga", order: "Pedido", refund: "Reembolso", adjustment: "Ajuste" };

export async function AdminTransactionsTable({ type }: { type?: string }) {
  const filter = type ? `&type=eq.${type}` : "";
  const rows = await serviceRoleRest<Row[]>(`transactions?select=id,reference,type,amount_minor,created_at,metadata,profiles(email)${filter}&order=created_at.desc&limit=300`);
  if (rows.length === 0) return <div className="card"><span className="muted">Sin movimientos.</span></div>;
  return (
    <SimpleTable
      headers={["Fecha", "Cliente", "Tipo", "Monto", "Referencia", "Detalle"]}
      rows={rows.map((tx) => [
        new Date(tx.created_at).toLocaleString("es-DO"),
        tx.profiles?.email ?? "—",
        LABELS[tx.type] ?? tx.type,
        money(tx.amount_minor / 100),
        tx.reference,
        tx.metadata?.reason ?? "",
      ])}
    />
  );
}

