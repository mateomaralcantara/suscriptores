import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { requireAdmin, serviceRoleRest } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type Row = { id: string; action: string; entity_type: string; entity_id: string | null; new_data: Record<string, unknown> | null; created_at: string; profiles: { email: string } | null };

export default async function AdminAuditPage() {
  await requireAdmin();
  const rows = await serviceRoleRest<Row[]>("audit_logs?select=id,action,entity_type,entity_id,new_data,created_at,profiles(email)&order=created_at.desc&limit=300");
  return (
    <>
      <PageHeader title="Auditoría" description="Acciones administrativas sobre saldos y pedidos (300 más recientes)." />
      {rows.length === 0 ? (
        <div className="card"><span className="muted">Sin acciones registradas.</span></div>
      ) : (
        <SimpleTable
          headers={["Fecha", "Administrador", "Acción", "Entidad", "Datos"]}
          rows={rows.map((row) => [
            new Date(row.created_at).toLocaleString("es-DO"),
            row.profiles?.email ?? "—",
            row.action,
            `${row.entity_type} ${row.entity_id ?? ""}`,
            <code key={row.id}>{JSON.stringify(row.new_data)}</code>,
          ])}
        />
      )}
    </>
  );
}
