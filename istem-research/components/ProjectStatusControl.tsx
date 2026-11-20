"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { send } from "@/lib/client-api";
import { STATUS_LABELS, STATUS_TRANSITIONS, type ProjectStatus } from "@/lib/project-rules";

export function ProjectStatusControl({ projectId, status, canEdit, canArchive }: { projectId: string; status: ProjectStatus; canEdit: boolean; canArchive: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const options = STATUS_TRANSITIONS[status].filter((to) => (to === "archivado" || status === "archivado" ? canArchive : canEdit));
  if (options.length === 0) return <p className="small muted">No tienes acciones de estado disponibles.</p>;

  async function change(to: ProjectStatus) {
    setBusy(true);
    setError("");
    const result = await send("POST", `/api/v1/projects/${projectId}/status`, { status: to, reason });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setReason("");
    router.refresh();
  }

  return (
    <div className="form">
      <div className="field">
        <label htmlFor="status-reason">Motivo (queda en la auditoría)</label>
        <input id="status-reason" type="text" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="form-actions">
        {options.map((to) => (
          <button key={to} type="button" className={`btn small${to === "archivado" ? " danger" : ""}`} disabled={busy} onClick={() => change(to)}>
            Pasar a «{STATUS_LABELS[to]}»
          </button>
        ))}
      </div>
      {error ? <div className="alert error" role="alert">{error}</div> : null}
    </div>
  );
}
