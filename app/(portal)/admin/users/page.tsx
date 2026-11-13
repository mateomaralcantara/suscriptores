import { AdjustBalanceForm } from "@/components/AdminForms";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { money } from "@/lib/format";
import { requireAdmin, serviceRoleRest } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type Row = { id: string; email: string; full_name: string; role: string; status: string; created_at: string; wallets: { available_minor: number; reserved_minor: number }[] };

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await serviceRoleRest<Row[]>("profiles?select=id,email,full_name,role,status,created_at,wallets(available_minor,reserved_minor)&order=created_at.desc&limit=500");
  return (
    <>
      <PageHeader title="Usuarios" description={`${users.length} cuentas registradas (máx. 500 más recientes).`} />
      {users.length > 0 ? <AdjustBalanceForm users={users.map((user) => ({ id: user.id, email: user.email }))} /> : null}
      <div style={{ marginTop: 18 }}>
        <SimpleTable
          headers={["Correo", "Nombre", "Rol", "Estado", "Disponible", "Reservado", "Alta"]}
          rows={users.map((user) => [
            user.email,
            user.full_name,
            user.role,
            <StatusBadge key={user.id} status={user.status} />,
            money((user.wallets[0]?.available_minor ?? 0) / 100),
            money((user.wallets[0]?.reserved_minor ?? 0) / 100),
            new Date(user.created_at).toLocaleDateString("es-DO"),
          ])}
        />
      </div>
    </>
  );
}
