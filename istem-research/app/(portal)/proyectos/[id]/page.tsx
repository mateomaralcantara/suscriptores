import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ProjectStatusControl } from "@/components/ProjectStatusControl";
import { ProjectTeam } from "@/components/ProjectTeam";
import { StatusBadge } from "@/components/StatusBadge";
import { Warnings } from "@/components/Warnings";
import { getProject, listAudit, listGeoAreas, listMembers, listProjectMembers } from "@/lib/data";
import { assessInference, marginOfError, type SamplingDesign } from "@/lib/methodology";
import { METHODS, OBJECTIVE_TYPES, SAMPLING_DESIGNS } from "@/lib/project-rules";
import { requireOrganization } from "@/lib/session";

export const metadata: Metadata = { title: "Proyecto" };

const ACTIONS: Record<string, string> = {
  "project.created": "Proyecto creado",
  "project.updated": "Proyecto editado",
  "project.status_changed": "Cambio de estado",
  "project.member_set": "Persona asignada",
  "project.member_removed": "Persona retirada",
};

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { token, user, active } = await requireOrganization();
  const project = await getProject(token, id);
  if (!project || project.organization_id !== active.organization.id) notFound();

  const perms = active.permissions;
  const canSeeMembers = perms.includes("members.view");
  const [assigned, orgMembers, areas, audit] = await Promise.all([
    listProjectMembers(token, project.id),
    canSeeMembers ? listMembers(token, active.organization.id) : Promise.resolve([]),
    listGeoAreas(token, project.country_code),
    perms.includes("audit.view") ? listAudit(token, active.organization.id, { entityId: project.id, limit: 50 }) : Promise.resolve(null),
  ]);
  const person = (userId: string) => {
    const m = orgMembers.find((x) => x.user_id === userId);
    return { user_id: userId, name: m?.profile?.full_name ?? (userId === user.id ? "Tú" : ""), email: m?.profile?.email ?? (userId === user.id ? user.email ?? "" : "Miembro") };
  };
  const isResponsible = assigned.some((a) => a.user_id === user.id && a.role === "responsable");
  const canManageTeam = canSeeMembers && (perms.includes("project.manage_members") || isResponsible);
  const editable = perms.includes("project.edit") && !["terminado", "archivado"].includes(project.status);

  const design = project.sampling_design as SamplingDesign;
  const margin = project.planned_sample_size && project.planned_sample_size >= 2
    ? marginOfError({ n: project.planned_sample_size, design, confidence: Number(project.confidence_level ?? 0.95) })
    : null;
  const warnings = assessInference({ design, methods: project.methods, plannedSampleSize: project.planned_sample_size });

  return (
    <>
      <PageHeader
        eyebrow={`${project.code} · versión ${project.version}`}
        title={project.title}
        description={<StatusBadge status={project.status} />}
        actions={editable ? <Link className="btn" href={`/proyectos/${project.id}/editar`}>Editar</Link> : null}
      />
      <div className="grid cols-2">
        <section className="card">
          <h2>Diseño de la investigación</h2>
          <dl className="dl">
            <dt>Pregunta</dt><dd>{project.research_question}</dd>
            <dt>Objetivo</dt><dd>{OBJECTIVE_TYPES[project.objective_type as keyof typeof OBJECTIVE_TYPES] ?? project.objective_type}</dd>
            {project.description ? <><dt>Contexto</dt><dd style={{ whiteSpace: "pre-wrap" }}>{project.description}</dd></> : null}
            <dt>Población</dt><dd>{project.target_population || "Sin definir"}</dd>
            <dt>Territorio</dt>
            <dd>{project.geo_area_codes.length ? project.geo_area_codes.map((c) => areas.find((a) => a.code === c)?.name ?? c).join(", ") : "Sin definir"}</dd>
            <dt>Periodo</dt><dd>{project.starts_on ?? "—"} → {project.ends_on ?? "—"}</dd>
            <dt>Métodos</dt>
            <dd className="tags">{project.methods.length ? project.methods.map((m) => <span key={m} className="badge neutral">{METHODS[m as keyof typeof METHODS] ?? m}</span>) : "Sin definir"}</dd>
          </dl>
        </section>
        <section className="card">
          <h2>Muestreo e incertidumbre</h2>
          <dl className="dl">
            <dt>Diseño muestral</dt><dd>{SAMPLING_DESIGNS[design] ?? design}</dd>
            <dt>Muestra prevista</dt><dd>{project.planned_sample_size?.toLocaleString("es-DO") ?? "—"}</dd>
            <dt>Margen objetivo</dt>
            <dd>{project.target_moe !== null ? `±${(Number(project.target_moe) * 100).toLocaleString("es-DO")} puntos al ${Math.round(Number(project.confidence_level) * 100)} %` : "No aplica / sin definir"}</dd>
            <dt>Margen con n previsto</dt>
            <dd>
              {margin === null ? "—" : margin.applicable
                ? `±${(margin.marginOfError * 100).toLocaleString("es-DO", { maximumFractionDigits: 2 })} puntos (aleatorio simple, p = 0,5, sin efecto de diseño)`
                : <span className="badge warn">No aplica</span>}
            </dd>
          </dl>
          <Warnings items={warnings} />
          <p className="small"><Link href="/muestras">Abrir el simulador muestral</Link></p>
        </section>
      </div>

      <div className="grid cols-2" style={{ marginTop: "1rem" }}>
        <section className="card">
          <h2>Equipo del proyecto</h2>
          <ProjectTeam
            projectId={project.id}
            assigned={assigned.map((a) => ({ ...person(a.user_id), role: a.role }))}
            candidates={orgMembers.map((m) => person(m.user_id))}
            canManage={canManageTeam}
          />
        </section>
        <section className="card">
          <h2>Estado</h2>
          <ProjectStatusControl projectId={project.id} status={project.status} canEdit={perms.includes("project.edit")} canArchive={perms.includes("project.archive")} />
        </section>
      </div>

      {audit ? (
        <section className="card" style={{ marginTop: "1rem" }}>
          <div className="card-head"><h2>Trazabilidad</h2><p>Registro de auditoría de este proyecto (encadenado).</p></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Acción</th><th>Detalle</th><th>Huella</th></tr></thead>
              <tbody>
                {audit.map((e) => (
                  <tr key={e.id}>
                    <td className="small">{new Date(e.created_at).toLocaleString("es-DO")}</td>
                    <td>{ACTIONS[e.action] ?? e.action}</td>
                    <td className="small mono">{JSON.stringify(e.details)}</td>
                    <td className="small mono" title={e.hash}>{e.hash.slice(0, 12)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
