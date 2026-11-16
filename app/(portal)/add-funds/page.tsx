import { redirect } from "next/navigation";
import { BankTransferForm } from "@/components/BankTransferForm";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { TopupForm, type TopupMethod } from "@/components/TopupForm";
import { getBankAccounts, getBankTransferCurrency, getBankTransferRate, isBankTransferConfigured, listTopupRequestsForProfile } from "@/lib/bank-transfer";
import { getCryptoMinMinor, getNowPaymentsPayLabel, isNowPaymentsConfigured } from "@/lib/nowpayments";
import { money } from "@/lib/format";
import { TOPUP_MAX_MINOR, TOPUP_MIN_MINOR } from "@/lib/order-status";
import { isStripeConfigured } from "@/lib/stripe";
import { ensureProfileForUser, getCurrentUser, getWalletForProfile, listTransactionsForProfile } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const REQUEST_STATUS: Record<string, [string, string]> = {
  pending: ["pending", "Pendiente de verificación"],
  approved: ["completed", "Acreditada"],
  rejected: ["failed", "Rechazada"],
};

export default async function AddFundsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { status } = await searchParams;
  const profile = await ensureProfileForUser(user);
  const bankTransfers = isBankTransferConfigured();
  const [wallet, transactions, requests] = await Promise.all([
    getWalletForProfile(profile.id),
    listTransactionsForProfile(profile.id),
    bankTransfers ? listTopupRequestsForProfile(profile.id).catch(() => []) : Promise.resolve([]),
  ]);
  const topups = transactions.filter((tx) => tx.type === "topup");
  const methods: TopupMethod[] = [...(isNowPaymentsConfigured() ? ["crypto" as const] : []), ...(isStripeConfigured() ? ["card" as const] : [])];
  const anyMethod = methods.length > 0 || bankTransfers;

  return (
    <>
      <PageHeader title="Agregar fondos" description="Recarga tu saldo y úsalo para tus pedidos." />
      {status === "success" ? (
        <div className="toast" style={{ marginBottom: 18 }}>Pago recibido. El saldo se acredita en cuanto se confirma el pago; recarga la página si aún no aparece.</div>
      ) : null}
      {status === "canceled" ? <div className="notice" style={{ marginBottom: 18 }}>Pago cancelado. No se realizó ningún cargo.</div> : null}

      <div className="card" style={{ marginBottom: 18 }}>
        <span className="muted">Saldo disponible</span>
        <h3>{money((wallet?.available_minor ?? 0) / 100)}</h3>
        <span className="muted">Reservado en pedidos en curso: {money((wallet?.reserved_minor ?? 0) / 100)}</span>
      </div>

      {anyMethod ? (
        <div className="grid two" style={{ marginBottom: 18, alignItems: "start" }}>
          {bankTransfers ? (
            <BankTransferForm
              accounts={getBankAccounts()}
              currency={getBankTransferCurrency()}
              max={TOPUP_MAX_MINOR / 100}
              min={TOPUP_MIN_MINOR / 100}
              rate={getBankTransferRate()}
            />
          ) : null}
          {methods.length > 0 ? <TopupForm cryptoLabel={getNowPaymentsPayLabel()} cryptoMin={getCryptoMinMinor() / 100} max={TOPUP_MAX_MINOR / 100} methods={methods} min={TOPUP_MIN_MINOR / 100} /> : null}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3>Pagos no disponibles</h3>
          <span className="muted">Aún no hay métodos de pago configurados. Contacta con soporte para recargar tu saldo.</span>
        </div>
      )}

      {requests.length > 0 ? (
        <>
          <h3>Tus transferencias reportadas</h3>
          <SimpleTable
            headers={["Solicitud", "Fecha", "Banco", "Monto", "Referencia", "Estado"]}
            rows={requests.map((item) => [
              item.public_id,
              new Date(item.created_at).toLocaleString("es-DO"),
              item.bank,
              money(item.amount_minor / 100),
              item.reference,
              <span key={item.id} title={item.review_reason ?? undefined}>
                <StatusBadge status={REQUEST_STATUS[item.status]?.[0] ?? item.status} /> {REQUEST_STATUS[item.status]?.[1] ?? item.status}
                {item.status === "rejected" && item.review_reason ? <small className="muted"> · {item.review_reason}</small> : null}
              </span>,
            ])}
          />
          <div style={{ height: 18 }} />
        </>
      ) : null}

      <h3>Recargas acreditadas</h3>
      {topups.length === 0 ? (
        <div className="card"><span className="muted">Todavía no tienes recargas acreditadas.</span></div>
      ) : (
        <SimpleTable
          headers={["Fecha", "Monto", "Referencia"]}
          rows={topups.map((tx) => [new Date(tx.created_at).toLocaleString("es-DO"), money(tx.amount_minor / 100), tx.reference.replace(/^topup:(nowpayments:|bank:)?/, "")])}
        />
      )}
    </>
  );
}
