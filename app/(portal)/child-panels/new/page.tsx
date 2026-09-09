import { PageHeader } from "@/components/PageHeader";
import { SandboxForm } from "@/components/SandboxForm";
export default function NewChildPanelPage() { return <><PageHeader title="Nuevo panel secundario" description="Configura nombre, dominio, idioma, moneda, plan y margen global." /><SandboxForm kind="panel" /></>; }
