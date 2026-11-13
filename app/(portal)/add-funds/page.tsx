import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { TopupForm } from "@/components/TopupForm";
import { money } from "@/lib/format";
import { TOPUP_MAX_MINOR, TOPUP_MIN_MINOR } from "@/lib/order-status";
import { isStripeConfigured } from "@/lib/stripe";
import { ensureProfileForUser, getCurrentUser, getWalletForProfile, listTransactionsForProfile } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AddFundsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { status } = await searchParams;
  const profile = await ensureProfileForUser(user);
  const [wallet, transactions] = await Promise.all([getWalletForProfile(profile.id), listTransactionsForProfile(profile.id)]);
  const topups = transactions.filter((tx) => tx.type === "topup");

  return (
    <>
      <PageHeader title="Agregar fondos" description="Recarga tu saldo con tarjeta. Los pedidos se pagan con el saldo disponible." />
      {status === "success" ? (
        <div className="toast" style={{ marginBottom: 18 }}>Pago recibido. El saldo se acredita en cuanto Stripe lo confirma (normalmente en segundos); recarga la página si aún no aparece.</div>
      ) : null}
      {status === "canceled" ? <div className="notice" style={{ marginBottom: 18 }}>Pago cancelado. No se realizó ningún cargo.</div> : null}
      <div className="grid two" style={{ marginBottom: 18 }}>
        <div className="card">
          <span className="muted">Saldo disponible</span>
          <h3>{money((wallet?.available_minor ?? 0) / 100)}</h3>
          <span className="muted">Reservado en pedidos en curso: {money((wallet?.reserved_minor ?? 0) / 100)}</span>
        </div>
        {isStripeConfigured() ? (
          <TopupForm max={TOPUP_MAX_MINOR / 100} min={TOPUP_MIN_MINOR / 100} />
        ) : (
          <div className="card">
            <h3>Pagos no disponibles</h3>
            <span className="muted">Los pagos con tarjeta aún no están configurados. Contacta con soporte para recargar tu saldo.</span>
          </div>
        )}
      </div>
      <h3>Recargas recientes</h3>
      {topups.length === 0 ? (
        <div className="card"><span className="muted">Todavía no has hecho recargas.</span></div>
      ) : (
        <SimpleTable
          headers={["Fecha", "Monto", "Referencia"]}
          rows={topups.map((tx) => [new Date(tx.created_at).toLocaleString("es-DO"), money(tx.amount_minor / 100), tx.reference.replace(/^topup:/, "")])}
        />
      )}
    </>
  );
}
