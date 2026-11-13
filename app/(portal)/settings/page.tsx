import Link from "next/link";
import { ApiKeysCard } from "@/components/ApiKeysCard";
import { PageHeader } from "@/components/PageHeader";
import { appUrl } from "@/lib/stripe";
import { getSessionProfile, isAdminUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, profile } = await getSessionProfile();
  return (
    <>
      <PageHeader title="Mi cuenta" description="Datos de tu cuenta y seguridad." />
      <div className="grid two">
        <section className="card">
          <h3>Perfil</h3>
          <div className="list">
            <div className="list-item"><span>Nombre</span><strong>{profile.full_name}</strong></div>
            <div className="list-item"><span>Correo</span><strong>{profile.email}</strong></div>
            <div className="list-item"><span>Correo confirmado</span><strong>{user.email_confirmed_at ? "Sí" : "No"}</strong></div>
            <div className="list-item"><span>Moneda</span><strong>{profile.currency ?? "USD"}</strong></div>
            <div className="list-item"><span>Rol</span><strong>{isAdminUser(user) ? "Administrador" : "Cliente"}</strong></div>
          </div>
        </section>
        <section className="card">
          <h3>Seguridad</h3>
          <p className="muted">Para cambiar tu contraseña te enviaremos un enlace a tu correo.</p>
          <Link className="btn" href="/forgot-password">Cambiar contraseña</Link>
          <p className="muted" style={{ marginTop: 16 }}>¿Necesitas cambiar tu correo o cerrar la cuenta? <Link href="/tickets/new">Abre un ticket</Link>.</p>
        </section>
      </div>
      <div style={{ marginTop: 18 }}>
        <ApiKeysCard apiUrl={`${appUrl()}/api/v2`} />
      </div>
    </>
  );
}
