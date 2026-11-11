import { FundsForm } from "@/components/FundsForm";
import { PageHeader } from "@/components/PageHeader";
import { isDemoMode } from "@/lib/config";
import { money } from "@/lib/format";
import { microsToUsd } from "@/lib/money";
import { requireUser } from "@/lib/server/current-user";
import { getStore } from "@/lib/store";

export default async function AddFundsPage() {
  const user = await requireUser();
  return <>
    <PageHeader title="Agregar fondos" description="Recarga tu cartera para crear pedidos." />
    <div className="grid four" style={{ marginBottom: 18 }}><div className="card"><span className="muted">Saldo disponible</span><h3>{money(microsToUsd(getStore().balanceMicros(user.id)))}</h3></div></div>
    {isDemoMode() ? <FundsForm /> : <div className="card notice">Los pagos reales aún no están habilitados: falta configurar una pasarela de pago.</div>}
  </>;
}
