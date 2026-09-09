import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SandboxForm } from "@/components/SandboxForm";
export default function RegisterPage() { return <main className="auth-page"><section className="card auth-card"><Brand /><h1>Crear cuenta</h1><p className="muted">Registro simulado para clientes, estudiantes y revendedores.</p><SandboxForm kind="register" /><div className="form-actions"><Link className="btn" href="/login">Ya tengo cuenta</Link></div></section></main>; }
