import { AdminEntityPage } from "@/components/AdminEntityPage";
import { StatusBadge } from "@/components/StatusBadge";
import { users } from "@/lib/demo-data";
import { money } from "@/lib/format";
export default function Page() { return <AdminEntityPage title="Usuarios" description="Roles, balances, sesiones, dispositivos, bloqueo y niveles de cliente." headers={["ID","Usuario","Correo","Rol","Balance","Estado"]} rows={users.map((u) => [u.id,u.name,u.email,u.role,money(u.balance),<StatusBadge status={u.status} key={u.id} />])} stats={[["Activos","1,186"],["Revendedores","214"],["VIP","48"],["Bloqueados","12"]]} />; }
