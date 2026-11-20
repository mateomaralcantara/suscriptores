import type { Metadata } from "next";
import { CreateOrgForm } from "@/components/CreateOrgForm";
import { PageHeader } from "@/components/PageHeader";
import { requirePortalSession } from "@/lib/session";

export const metadata: Metadata = { title: "Nueva organización" };

export default async function NewOrganizationPage() {
  const session = await requirePortalSession();
  return (
    <div style={{ maxWidth: 640 }}>
      <PageHeader
        eyebrow="Organización"
        title={session.memberships.length ? "Nueva organización" : "Crea tu organización"}
        description="Cada organización es un espacio aislado: sus proyectos, miembros, datos y auditoría no son visibles para otras organizaciones."
      />
      <CreateOrgForm />
    </div>
  );
}
