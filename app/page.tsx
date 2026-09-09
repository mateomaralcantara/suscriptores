import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  ["100 servicios demo", "Catálogo con precios, proveedores, filtros, calidad, refill y cancelación."],
  ["Pedidos individuales y masivos", "Validación, costos, idempotencia, lotes y simulación de cola."],
  ["Administración integral", "Usuarios, servicios, proveedores, pagos, auditoría, tickets y tenants."],
  ["API REST sandbox", "Endpoints documentados, claves demo, webhooks y ejemplos de integración."],
  ["Marca blanca", "Paneles secundarios con branding, monedas, idiomas y márgenes independientes."],
  ["Contabilidad verificable", "Balance disponible, reservado, transacciones, bonos y reembolsos."],
];

export default function HomePage() {
  return (
    <div className="page">
      <div className="shell">
        <nav className="public-nav">
          <Brand />
          <div className="nav-links"><Link href="#funciones">Funciones</Link><Link href="/api-docs">API</Link><Link href="/help">Ayuda</Link></div>
          <div className="nav-actions"><ThemeToggle /><Link className="btn" href="/login">Entrar</Link><Link className="btn primary" href="/register">Crear cuenta</Link></div>
        </nav>
        <section className="hero">
          <div>
            <div className="eyebrow">CLASSROOM · SANDBOX · DEMO</div>
            <h1>Opera, revende y administra desde un solo laboratorio.</h1>
            <div className="lead">Una plataforma completa para gestionar servicios digitales legales, pedidos, proveedores simulados, balances, APIs, soporte, afiliados y paneles secundarios sin ejecutar acciones reales.</div>
            <div className="hero-actions"><Link className="btn primary" href="/dashboard">Abrir dashboard</Link><Link className="btn" href="/services">Explorar servicios</Link></div>
          </div>
          <aside className="hero-card">
            <div className="eyebrow">Resumen operativo</div>
            <div className="hero-grid" style={{ marginTop: 18 }}>
              <div className="metric"><span>Balance demo</span><strong>US$12,480</strong></div>
              <div className="metric"><span>Pedidos activos</span><strong>184</strong></div>
              <div className="metric"><span>Servicios</span><strong>100</strong></div>
              <div className="metric"><span>Éxito</span><strong>98.4%</strong></div>
            </div>
            <div className="notice" style={{ marginTop: 16 }}>Todo lo que ves funciona con datos simulados y endpoints sandbox.</div>
          </aside>
        </section>
        <section className="section" id="funciones">
          <div className="section-title"><div><div className="eyebrow">Plataforma completa</div><h2>Más que una landing bonita.</h2></div><span className="muted">40+ rutas · 100 servicios · API sandbox</span></div>
          <div className="feature-grid">{features.map(([title, text]) => <article className="card" key={title}><h3>{title}</h3><p className="muted">{text}</p></article>)}</div>
        </section>
        <footer className="footer"><div>Growth Reseller Lab · Modo demostración · <Link href="/terms">Términos</Link> · <Link href="/privacy">Privacidad</Link> · <Link href="/refund-policy">Reembolsos</Link></div></footer>
      </div>
    </div>
  );
}
