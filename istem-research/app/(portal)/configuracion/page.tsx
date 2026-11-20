import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { getSubscription, listRoles } from "@/lib/data";
import { requireOrganization } from "@/lib/session";

export const metadata: Metadata = { title: "Configuración" };

const SUB_STATUS: Record<string, string> = { inactiva: "Inactiva (sin cobros)", prueba: "Prueba", activa: "Activa", suspendida: "Suspendida", cancelada: "Cancelada" };

export default async function SettingsPage() {
  const { token, user, active } = await requireOrganization();
  const [roles, subscription] = await Promise.all([
    listRoles(token),
    active.permissions.includes("billing.view") ? getSubscription(token, active.organization.id) : Promise.resolve(null),
  ]);
  const roleName = roles.find((r) => r.code === active.role_code)?.name ?? active.role_code;
  return (
    <>
      <PageHeader title="Configuración" description="Tu cuenta, la organización activa y su suscripción." />
      <div className="grid cols-2">
        <section className="card">
          <h2>Tu cuenta</h2>
          <dl className="dl">
            <dt>Correo</dt><dd>{user.email}</dd>
            <dt>Correo confirmado</dt><dd>{user.email_confirmed_at ? "Sí" : "No"}</dd>
            <dt>Rol en la organización</dt><dd>{roleName}</dd>
            <dt>Permisos</dt><dd className="tags">{active.permissions.map((p) => <span key={p} className="badge neutral mono">{p}</span>)}</dd>
          </dl>
          <div className="alert info"><strong>Autenticación multifactor</strong>Prevista para la fase 7 mediante Supabase Auth MFA (TOTP). Mientras tanto, use una contraseña única y larga.</div>
        </section>
        <section className="card">
          <h2>Organización</h2>
          <dl className="dl">
            <dt>Nombre</dt><dd>{active.organization.name}</dd>
            <dt>Identificador</dt><dd className="mono">{active.organization.slug}</dd>
            <dt>País</dt><dd>{active.organization.country_code}</dd>
            <dt>Creada</dt><dd>{new Date(active.organization.created_at).toLocaleDateString("es-DO")}</dd>
          </dl>
          {subscription ? (
            <>
              <h3 style={{ marginTop: "1rem" }}>Suscripción</h3>
              <dl className="dl">
                <dt>Plan</dt><dd>{subscription.plan_code}</dd>
                <dt>Estado</dt><dd>{SUB_STATUS[subscription.status] ?? subscription.status}</dd>
              </dl>
              <p className="small muted">Ningún servicio de pago se activa sin autorización expresa de un superadministrador; cada cambio queda auditado.</p>
            </>
          ) : null}
        </section>
      </div>
    </>
  );
}
