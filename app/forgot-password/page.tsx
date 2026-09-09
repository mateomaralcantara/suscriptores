import Link from "next/link";
import { Brand } from "@/components/Brand";
import { AuthForm } from "@/components/AuthForm";

export default function ForgotPage() {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <Brand />
        <h1>Recuperar acceso</h1>
        <p className="muted">Recibirás un correo de recuperación gestionado por Supabase.</p>
        <AuthForm kind="forgot" />
        <div className="form-actions"><Link className="btn" href="/login">Volver</Link></div>
      </section>
    </main>
  );
}
