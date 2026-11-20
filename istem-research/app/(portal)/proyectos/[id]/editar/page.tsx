import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ProjectForm } from "@/components/ProjectForm";
import { getProject, listGeoAreas } from "@/lib/data";
import { requireOrganization } from "@/lib/session";

export const metadata: Metadata = { title: "Editar proyecto" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, active } = await requireOrganization();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const project = await getProject(token, id);
  if (!project || project.organization_id !== active.organization.id) notFound();
  if (!active.permissions.includes("project.edit") || ["terminado", "archivado"].includes(project.status)) redirect(`/proyectos/${id}`);
  const areas = (await listGeoAreas(token, "DO")).filter((a) => a.level === "provincia");
  const moe = project.target_moe === null ? "" : String(Math.round(Number(project.target_moe) * 10000) / 100);
  return (
    <>
      <PageHeader eyebrow={project.code} title="Editar proyecto" description={`Versión ${project.version}. Si otra persona guarda antes, se te pedirá recargar.`} />
      <ProjectForm
        organizationId={active.organization.id}
        areas={areas.map((a) => ({ code: a.code, name: a.name }))}
        projectId={project.id}
        version={project.version}
        initial={{
          title: project.title,
          research_question: project.research_question,
          objective_type: project.objective_type,
          description: project.description,
          target_population: project.target_population,
          geo_area_codes: project.geo_area_codes,
          methods: project.methods,
          sampling_design: project.sampling_design,
          planned_sample_size: project.planned_sample_size === null ? "" : String(project.planned_sample_size),
          moe_points: moe,
          confidence_level: project.confidence_level === null ? "0.95" : String(Number(project.confidence_level)),
          starts_on: project.starts_on ?? "",
          ends_on: project.ends_on ?? "",
        }}
      />
    </>
  );
}
