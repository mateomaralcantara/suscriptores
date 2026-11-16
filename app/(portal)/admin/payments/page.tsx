import { AdminTransactionsTable } from "@/components/AdminTransactionsTable";
import { PageHeader } from "@/components/PageHeader";
import { isStripeConfigured } from "@/lib/stripe";
import { requireAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Pagos" description={`Recargas con tarjeta acreditadas. Stripe: ${isStripeConfigured() ? "configurado" : "NO configurado"}.`} />
      <AdminTransactionsTable type="topup" />
    </>
  );
}
