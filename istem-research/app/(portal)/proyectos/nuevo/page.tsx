import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ProjectForm } from "@/components/ProjectForm";
import { listGeoAreas } from "@/lib/data";
import { requireOrganization } from "@/lib/session";

export const metadata: Metadata = { title: "Nuevo proyecto" };

export default async function NewProjectPage() {
  const { token, active } = await requireOrganization();
  if (!active.permissions.includes("project.create")) redirect("/proyectos");
  const areas = (await listGeoAreas(token, "DO")).filter((a) => a.level === "provincia");
  return (
    <>
      <PageHeader
        eyebrow="Centro de investigaciones"
        title="Nuevo proyecto"
        description="Asistente guiado por objetivos: pregunta, población, métodos y diseño muestral. Podrás ajustarlo mientras esté en borrador o diseño."
      />
      <ProjectForm organizationId={active.organization.id} areas={areas.map((a) => ({ code: a.code, name: a.name }))} />
    </>
  );
}
