import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { MODULES, PHASES, moduleBySlug } from "@/lib/modules";
import { requirePortalSession } from "@/lib/session";

export function generateStaticParams() {
  return MODULES.filter((m) => m.href.startsWith("/modulos/")).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: moduleBySlug(slug)?.label ?? "Módulo" };
}

/** Módulos aún no implementados: muestran su fase real, sin datos de ejemplo ni conexiones simuladas. */
export default async function ComingSoonPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePortalSession();
  const { slug } = await params;
  const mod = moduleBySlug(slug);
  if (!mod || !mod.href.startsWith("/modulos/")) notFound();
  return (
    <>
      <PageHeader eyebrow={mod.engine ?? "Módulo"} title={mod.label} description={mod.summary} />
      <section className="card" style={{ maxWidth: 760 }}>
        <div className="card-head">
          <h2>Planificado para la fase {mod.phase}: {PHASES[mod.phase]}</h2>
          <span className={`badge ${mod.status === "parcial" ? "info" : "neutral"}`}>{mod.status === "parcial" ? "Disponible en parte" : "No disponible aún"}</span>
        </div>
        <p>
          Este módulo todavía no está implementado. Para cumplir el principio de la plataforma, no se muestran datos de ejemplo
          ni integraciones simuladas: cuando una fuente o función no está disponible, se declara así.
        </p>
        {mod.slug === "geo" ? (
          <p>Ya disponible: el catálogo de las 31 provincias y el Distrito Nacional se usa para definir la cobertura territorial de los proyectos.</p>
        ) : null}
        {mod.slug === "fuentes" ? (
          <p>Ninguna fuente externa (redes sociales, medios, buscadores) está conectada. Cada conector requerirá una ficha de integración verificada: API oficial, permisos, límites, retención, uso comercial y mecanismo de eliminación.</p>
        ) : null}
        <p className="small muted">Diseño detallado en la documentación del repositorio (<code>istem-research/docs</code>).</p>
        <Link className="btn" href="/inicio">Volver al inicio</Link>
      </section>
    </>
  );
}
