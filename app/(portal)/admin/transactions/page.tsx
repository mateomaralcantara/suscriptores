import { AdminTransactionsTable } from "@/components/AdminTransactionsTable";
import { PageHeader } from "@/components/PageHeader";
import { requireAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Libro de movimientos" description="Recargas, pedidos, reembolsos y ajustes de todas las cuentas (300 más recientes)." />
      <AdminTransactionsTable />
    </>
  );
}
