import type { Metadata } from "next";
import { AuditVerify } from "@/components/AuditVerify";
import { MembersManager } from "@/components/MembersManager";
import { PageHeader } from "@/components/PageHeader";
import { listAudit, listMembers, listRoles } from "@/lib/data";
import { requireOrganization } from "@/lib/session";

export const metadata: Metadata = { title: "Administración" };

const ACTION_LABELS: Record<string, string> = {
  "organization.created": "Organización creada",
  "member.added": "Miembro agregado",
  "member.role_changed": "Rol cambiado",
  "member.removed": "Miembro retirado",
  "project.created": "Proyecto creado",
  "project.updated": "Proyecto editado",
  "project.status_changed": "Cambio de estado de proyecto",
  "project.member_set": "Asignación a proyecto",
  "project.member_removed": "Retiro de proyecto",
  "subscription.changed": "Suscripción modificada",
};

export default async function AdminPage() {
  const { token, user, active } = await requireOrganization();
  const orgId = active.organization.id;
  const perms = active.permissions;
  const [members, roles, audit] = await Promise.all([
    perms.includes("members.view") ? listMembers(token, orgId) : Promise.resolve(null),
    listRoles(token),
    perms.includes("audit.view") ? listAudit(token, orgId, { limit: 100 }) : Promise.resolve(null),
  ]);
  const emailOf = (id: string | null) => members?.find((m) => m.user_id === id)?.profile?.email ?? (id ? `${id.slice(0, 8)}…` : "sistema");

  return (
    <>
      <PageHeader eyebrow={active.organization.name} title="Administración" description="Miembros, roles y registro de auditoría de la organización." />
      {members ? (
        <section className="card">
          <div className="card-head"><h2>Miembros</h2><p>Los permisos se aplican en la base de datos (RLS), no solo en la interfaz.</p></div>
          <MembersManager
            orgId={orgId}
            canManage={perms.includes("members.manage")}
            roles={roles.map((r) => ({ code: r.code, name: r.name, description: r.description }))}
            members={members.map((m) => ({ user_id: m.user_id, role_code: m.role_code, email: m.profile?.email ?? "", name: m.profile?.full_name ?? "", isMe: m.user_id === user.id }))}
          />
        </section>
      ) : (
        <div className="alert info">Tu rol no incluye la gestión de miembros.</div>
      )}

      <section className="card">
        <div className="card-head"><h2>Roles y permisos</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Rol</th><th>Descripción</th></tr></thead>
            <tbody>{roles.map((r) => <tr key={r.code}><td>{r.name}</td><td className="small">{r.description}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {audit ? (
        <section className="card">
          <div className="card-head"><h2>Auditoría</h2><AuditVerify orgId={orgId} /></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Fecha</th><th>Actor</th><th>Acción</th><th>Detalle</th><th>Huella</th></tr></thead>
              <tbody>
                {audit.map((e) => (
                  <tr key={e.id}>
                    <td className="num mono">{e.id}</td>
                    <td className="small">{new Date(e.created_at).toLocaleString("es-DO")}</td>
                    <td className="small">{emailOf(e.actor_id)}</td>
                    <td>{ACTION_LABELS[e.action] ?? e.action}</td>
                    <td className="small mono">{JSON.stringify(e.details)}</td>
                    <td className="small mono" title={e.hash}>{e.hash.slice(0, 12)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
