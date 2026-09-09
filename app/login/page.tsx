import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SandboxForm } from "@/components/SandboxForm";
export default function LoginPage() { return <main className="auth-page"><section className="card auth-card"><Brand /><h1>Iniciar sesión</h1><p className="muted">Accede con las credenciales demo.</p><SandboxForm kind="login" /><div className="notice" style={{ marginTop: 14 }}>Admin: admin@classroom.local · DemoAdmin123!</div><div className="form-actions"><Link className="btn" href="/dashboard">Entrar al dashboard</Link><Link className="btn ghost" href="/forgot-password">Olvidé mi contraseña</Link></div></section></main>; }
