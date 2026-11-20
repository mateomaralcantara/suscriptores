import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { listProjects, projectCounts } from "@/lib/data";
import { MODULES, PHASES } from "@/lib/modules";
import { requireOrganization } from "@/lib/session";

export const metadata: Metadata = { title: "Inicio" };

function Kpi({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value.toLocaleString("es-DO")}</div>
      {note ? <div className="note">{note}</div> : null}
    </div>
  );
}

function Unavailable({ label, phase }: { label: string; phase: number }) {
  return (
    <div className="kpi unavailable">
      <div className="label">{label}</div>
      <div className="value">Sin datos</div>
      <div className="note">Disponible con la fase {phase} ({PHASES[phase]})</div>
    </div>
  );
}

export default async function HomePage() {
  const { token, active } = await requireOrganization();
  const orgId = active.organization.id;
  const [counts, recent] = await Promise.all([projectCounts(token, orgId), listProjects(token, orgId, { limit: 6 })]);
  const canSeeAll = active.permissions.includes("project.view_all");

  return (
    <>
      <PageHeader
        eyebrow={active.organization.name}
        title="Inicio"
        description={canSeeAll ? "Indicadores de toda la organización." : "Indicadores de los proyectos que tienes asignados."}
        actions={active.permissions.includes("project.create") ? <Link className="btn primary" href="/proyectos/nuevo">Nuevo proyecto</Link> : null}
      />
      <div className="grid cols-4">
        <Kpi label="Proyectos activos" value={counts.active} note="Diseño, campo, análisis o revisión" />
        <Kpi label="Investigaciones terminadas" value={counts.finished} />
        <Kpi label="Proyectos en total" value={counts.total} note={`${counts.archived} archivados`} />
        <Unavailable label="Entrevistas recibidas" phase={2} />
        <Unavailable label="Calidad de respuestas" phase={2} />
        <Unavailable label="Fuentes digitales conectadas" phase={3} />
        <Unavailable label="Estado de agentes" phase={5} />
        <Unavailable label="Costo operacional" phase={7} />
      </div>

      <div className="grid cols-2" style={{ marginTop: "1rem" }}>
        <section className="card">
          <div className="card-head">
            <h2>Proyectos recientes</h2>
            <Link href="/proyectos" className="small">Ver todos</Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty">
              Aún no hay proyectos.{" "}
              {active.permissions.includes("project.create") ? <Link href="/proyectos/nuevo">Crea el primero</Link> : "Pide que te asignen a uno."}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <tbody>
                  {recent.map((p) => (
                    <tr key={p.id}>
                      <td><Link href={`/proyectos/${p.id}`}>{p.title}</Link><div className="small muted mono">{p.code}</div></td>
                      <td className="num"><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Estado de la plataforma</h2>
            <p>Lo que funciona hoy y lo que viene.</p>
          </div>
          <div className="table-wrap">
            <table>
              <tbody>
                {Object.entries(PHASES).map(([phase, name]) => {
                  const modules = MODULES.filter((m) => m.phase === Number(phase));
                  const done = Number(phase) === 1;
                  return (
                    <tr key={phase}>
                      <td>Fase {phase} · {name}<div className="small muted">{modules.map((m) => m.label).join(", ") || "Infraestructura"}</div></td>
                      <td className="num">{done ? <span className="badge ok">Disponible</span> : <span className="badge neutral">Planificada</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
