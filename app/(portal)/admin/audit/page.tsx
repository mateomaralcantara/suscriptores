import { AdminEntityPage } from "@/components/AdminEntityPage";
import { auditLogs } from "@/lib/demo-data";
export default function Page() { return <AdminEntityPage title="Auditoría" description="Acciones administrativas, cambios de balance, permisos, API y exportaciones." headers={["ID","Actor","Acción","Entidad","IP","Fecha"]} rows={auditLogs.map((a) => [a.id,a.actor,a.action,a.entity,a.ip,a.date])} stats={[["Eventos hoy","1,284"],["Alertas","7"],["Exportaciones","14"],["Retención","365 días"]]} />; }
