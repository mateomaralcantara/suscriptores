import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SandboxForm } from "@/components/SandboxForm";
export default function ForgotPage() { return <main className="auth-page"><section className="card auth-card"><Brand /><h1>Recuperar acceso</h1><p className="muted">El correo se simula y no se envía fuera del laboratorio.</p><SandboxForm kind="forgot" /><div className="form-actions"><Link className="btn" href="/login">Volver</Link></div></section></main>; }
