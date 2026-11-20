import { STATUS_LABELS, type ProjectStatus } from "@/lib/project-rules";

const TONE: Record<ProjectStatus, string> = {
  borrador: "neutral",
  diseno: "info",
  campo: "brand",
  analisis: "brand",
  revision: "warn",
  en_pausa: "warn",
  terminado: "ok",
  archivado: "neutral",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`badge ${TONE[status] ?? "neutral"}`}>{STATUS_LABELS[status] ?? status}</span>;
}
