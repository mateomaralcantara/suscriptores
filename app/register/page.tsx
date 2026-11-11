import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { Brand } from "@/components/Brand";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <Brand />
        <h1>Crear cuenta</h1>
        <p className="muted">Registro de clientes y revendedores.</p>
        <AuthForm mode="register" />
        <div className="form-actions"><Link className="btn" href="/login">Ya tengo cuenta</Link></div>
      </section>
    </main>
  );
}
