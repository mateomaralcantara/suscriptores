import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Brand } from "@/components/Brand";
import { isDemoMode } from "@/lib/config";
import { DEMO_ADMIN, DEMO_CLIENT } from "@/lib/store";

// Rendered per request so the demo hint follows the runtime configuration.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <Brand />
        <h1>Iniciar sesión</h1>
        <p className="muted">Accede con tu correo y contraseña.</p>
        <AuthForm mode="login" />
        {isDemoMode() ? <div className="notice" style={{ marginTop: 14 }}>Modo demo · Admin: {DEMO_ADMIN.email} / {DEMO_ADMIN.password} · Cliente: {DEMO_CLIENT.email} / {DEMO_CLIENT.password}</div> : null}
        <div className="form-actions"><Link className="btn" href="/register">Crear cuenta</Link><Link className="btn ghost" href="/forgot-password">Olvidé mi contraseña</Link></div>
      </section>
    </main>
  );
}
