import { AdminEntityPage } from "@/components/AdminEntityPage";
import { StatusBadge } from "@/components/StatusBadge";
import { childPanels } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default function Page() { return <AdminEntityPage title="Paneles secundarios" description="Tenants, dominios, branding, planes, límites, datos aislados y ganancias." headers={["Panel","Dominio","Clientes","Ingresos","Estado"]} rows={childPanels.map((p) => [p.name,p.domain,p.clients,money(p.revenue),<StatusBadge status={p.status} key={p.name} />])} stats={[["Activos","2"],["Pendientes","1"],["Clientes","91"],["Ingresos","US$5,030"]]} />; }
