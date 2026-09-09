import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  ["Catálogo conectado", "Servicios sincronizados desde el proveedor configurado, con margen aplicado en el servidor."],
  ["Pedidos con control de balance", "Reserva atómica de fondos antes de enviar cada pedido al proveedor."],
  ["Autenticación Supabase", "Registro, inicio de sesión y recuperación de acceso con sesiones seguras."],
  ["Seguimiento operativo", "Pedidos, estados, balance y transacciones almacenados en PostgreSQL/Supabase."],
  ["Administración protegida", "Rutas administrativas restringidas por cuenta autorizada."],
  ["Integración preparada para producción", "Variables privadas en servidor, health check y validación automática del repositorio."],
];

export default function HomePage() {
  return (
    <div className="page">
      <div className="shell">
        <nav className="public-nav">
          <Brand />
          <div className="nav-links"><Link href="#funciones">Funciones</Link><Link href="/help">Ayuda</Link></div>
          <div className="nav-actions"><ThemeToggle /><Link className="btn" href="/login">Entrar</Link><Link className="btn primary" href="/register">Crear cuenta</Link></div>
        </nav>

        <section className="hero">
          <div>
            <div className="eyebrow">PLATAFORMA DE SERVICIOS DIGITALES</div>
            <h1>Gestiona servicios, pedidos y balance desde un solo panel.</h1>
            <div className="lead">Una plataforma operativa conectada a Supabase y preparada para consumir proveedores externos desde el backend sin exponer credenciales al navegador.</div>
            <div className="hero-actions"><Link className="btn primary" href="/register">Crear cuenta</Link><Link className="btn" href="/login">Iniciar sesión</Link></div>
          </div>
          <aside className="hero-card">
            <div className="eyebrow">Arquitectura operativa</div>
            <div className="list" style={{ marginTop: 18 }}>
              <div className="list-item"><span>Autenticación</span><strong>Supabase</strong></div>
              <div className="list-item"><span>Persistencia</span><strong>PostgreSQL</strong></div>
              <div className="list-item"><span>Proveedor</span><strong>API server-side</strong></div>
              <div className="list-item"><span>Seguridad de pedidos</span><strong>Reserva de balance</strong></div>
            </div>
          </aside>
        </section>

        <section className="section" id="funciones">
          <div className="section-title"><div><div className="eyebrow">Núcleo operativo</div><h2>Preparado para datos y operaciones reales.</h2></div></div>
          <div className="feature-grid">{features.map(([title, text]) => <article className="card" key={title}><h3>{title}</h3><p className="muted">{text}</p></article>)}</div>
        </section>

        <footer className="footer"><div>Growth Reseller Lab · <Link href="/terms">Términos</Link> · <Link href="/privacy">Privacidad</Link> · <Link href="/refund-policy">Reembolsos</Link></div></footer>
      </div>
    </div>
  );
}
