import { AdminEntityPage } from "@/components/AdminEntityPage";
import { StatusBadge } from "@/components/StatusBadge";
import { providers } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default function Page() { return <AdminEntityPage title="Proveedores" description="Adaptadores, credenciales cifradas, balance, prioridad, latencia y respaldo." headers={["Proveedor","Balance","Éxito","Latencia","Estado"]} rows={providers.map((p) => [p.name,money(p.balance),p.success,p.latency,<StatusBadge status={p.status} key={p.name} />])} stats={[["Conectados","3"],["Servicios mapeados","100"],["Éxito medio","97.8%"],["Fallos hoy","7"]]} />; }
