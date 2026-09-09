import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { childPanels } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default function ChildPanelsPage() { return <><PageHeader title="Paneles secundarios" description="Tenants independientes con branding, clientes, precios y dominios propios." action={<Link className="btn primary" href="/child-panels/new">Solicitar panel</Link>} /><SimpleTable headers={["Panel", "Dominio", "Clientes", "Ingresos", "Estado"]} rows={childPanels.map((panel) => [panel.name, panel.domain, panel.clients, money(panel.revenue), <StatusBadge status={panel.status} key={panel.name} />])} /></>; }
