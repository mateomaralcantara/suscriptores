import { PageHeader } from "@/components/PageHeader";
import { SandboxForm } from "@/components/SandboxForm";
export default function BulkOrdersPage() { return <><PageHeader title="Pedidos masivos" description="Importa, valida y procesa hasta 10,000 filas dentro del sandbox." /><div className="notice" style={{ marginBottom: 18 }}>Formato: service_id,target,quantity,comments,scheduled_at</div><SandboxForm kind="bulk" /></>; }
