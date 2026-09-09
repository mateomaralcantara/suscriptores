import Link from "next/link";
import { Brand } from "@/components/Brand";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <Brand />
        <h1>Iniciar sesión</h1>
        <p className="muted">Accede con tu cuenta registrada.</p>
        <AuthForm kind="login" />
        <div className="form-actions">
          <Link className="btn ghost" href="/forgot-password">Olvidé mi contraseña</Link>
          <Link className="btn" href="/register">Crear cuenta</Link>
        </div>
      </section>
    </main>
  );
}
