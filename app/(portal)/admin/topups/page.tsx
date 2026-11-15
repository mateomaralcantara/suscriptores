import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { TopupReview } from "@/components/TopupReview";
import { getBankTransferRate, isBankTransferConfigured, listTopupRequests } from "@/lib/bank-transfer";
import { money } from "@/lib/format";
import { requireAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const STATUS_ES: Record<string, string> = { pending: "pending", approved: "completed", rejected: "failed" };

export default async function AdminTopupsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status = "pending" } = await searchParams;
  const filter = status === "approved" || status === "rejected" || status === "pending" ? status : undefined;
  const requests = await listTopupRequests(filter);
  const local = (minor: number, currency: string) => `${currency === "DOP" ? "RD$" : `${currency} `}${(minor / 100).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  return (
    <>
      <PageHeader
        title="Recargas por transferencia"
        description={isBankTransferConfigured() ? `Verifica en la app de tu banco que el dinero llegó antes de aprobar. Tasa actual: ${getBankTransferRate()} por US$1.` : "Transferencias no configuradas: define BANK_TRANSFER_RATE y BANK_1_NAME / BANK_1_ACCOUNT_NUMBER."}
      />
      <div className="form-actions" style={{ marginBottom: 12 }}>
        {[["pending", "Pendientes"], ["approved", "Aprobadas"], ["rejected", "Rechazadas"], ["all", "Todas"]].map(([value, label]) => (
          <Link className={`btn small${status === value ? " primary" : ""}`} href={`/admin/topups?status=${value}`} key={value}>{label}</Link>
        ))}
      </div>
      {requests.length === 0 ? (
        <div className="card"><span className="muted">No hay solicitudes en este estado.</span></div>
      ) : (
        <SimpleTable
          headers={["Solicitud", "Cliente", "Banco", "Debe llegar", "Acredita", "Referencia", "Nota", "Fecha", "Estado / acción"]}
          rows={requests.map((item) => [
            item.public_id,
            item.profiles?.email ?? "—",
            item.bank,
            local(item.local_amount_minor, item.local_currency),
            money(item.amount_minor / 100),
            <code key={`${item.id}-r`}>{item.reference}</code>,
            item.note ?? "",
            new Date(item.created_at).toLocaleString("es-DO"),
            item.status === "pending"
              ? <TopupReview key={item.id} label={money(item.amount_minor / 100)} requestId={item.id} />
              : <span key={item.id}><StatusBadge status={STATUS_ES[item.status] ?? item.status} />{item.review_reason ? <small className="muted"> {item.review_reason}</small> : null}</span>,
          ])}
        />
      )}
    </>
  );
}
