import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { listProjects } from "@/lib/data";
import { OBJECTIVE_TYPES, PROJECT_STATUSES, STATUS_LABELS, SAMPLING_DESIGNS } from "@/lib/project-rules";
import { requireOrganization } from "@/lib/session";

export const metadata: Metadata = { title: "Centro de investigaciones" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { token, active } = await requireOrganization();
  const { estado } = await searchParams;
  const status = estado && (PROJECT_STATUSES as readonly string[]).includes(estado) ? estado : undefined;
  const projects = await listProjects(token, active.organization.id, { status });

  return (
    <>
      <PageHeader
        eyebrow="Centro de investigaciones"
        title="Proyectos"
        description="Cada proyecto parte de una pregunta de investigación, una población y un diseño metodológico explícitos."
        actions={active.permissions.includes("project.create") ? <Link className="btn primary" href="/proyectos/nuevo">Nuevo proyecto</Link> : null}
      />
      <nav className="tags" aria-label="Filtrar por estado" style={{ marginBottom: "1rem" }}>
        <Link className={`badge ${!status ? "brand" : "neutral"}`} href="/proyectos">Todos</Link>
        {PROJECT_STATUSES.map((s) => (
          <Link key={s} className={`badge ${status === s ? "brand" : "neutral"}`} href={`/proyectos?estado=${s}`}>{STATUS_LABELS[s]}</Link>
        ))}
      </nav>
      <section className="card">
        {projects.length === 0 ? (
          <div className="empty">No hay proyectos{status ? ` en estado «${STATUS_LABELS[status as keyof typeof STATUS_LABELS]}»` : ""}.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Proyecto</th><th>Objetivo</th><th>Diseño</th><th className="num">Muestra</th><th>Estado</th><th>Actualizado</th></tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/proyectos/${p.id}`}>{p.title}</Link><div className="small muted mono">{p.code}</div></td>
                    <td className="small">{OBJECTIVE_TYPES[p.objective_type as keyof typeof OBJECTIVE_TYPES]?.split(":")[0] ?? p.objective_type}</td>
                    <td className="small">{SAMPLING_DESIGNS[p.sampling_design as keyof typeof SAMPLING_DESIGNS]?.split(" (")[0] ?? p.sampling_design}</td>
                    <td className="num">{p.planned_sample_size?.toLocaleString("es-DO") ?? "—"}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="small muted">{new Date(p.updated_at).toLocaleDateString("es-DO")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
