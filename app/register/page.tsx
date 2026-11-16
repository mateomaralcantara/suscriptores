import Link from "next/link";
import { Brand } from "@/components/Brand";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <Brand />
        <h1>Crear cuenta</h1>
        <p className="muted">Regístrate para administrar tus servicios, pedidos y balance.</p>
        <AuthForm kind="register" />
        <div className="form-actions"><Link className="btn" href="/login">Ya tengo cuenta</Link></div>
      </section>
    </main>
  );
}
