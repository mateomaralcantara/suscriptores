"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { send } from "@/lib/client-api";

type Person = { user_id: string; name: string; email: string };
type Assigned = Person & { role: string };

const ROLES: Record<string, string> = { responsable: "Responsable", colaborador: "Colaborador", lector: "Lector" };

export function ProjectTeam({ projectId, assigned, candidates, canManage }: { projectId: string; assigned: Assigned[]; candidates: Person[]; canManage: boolean }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("colaborador");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const available = candidates.filter((c) => !assigned.some((a) => a.user_id === c.user_id));

  async function run(promise: Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError("");
    const result = await promise;
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Error");
    setUserId("");
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Persona</th><th>Rol en el proyecto</th>{canManage ? <th /> : null}</tr></thead>
          <tbody>
            {assigned.map((a) => (
              <tr key={a.user_id}>
                <td>{a.name || a.email}<div className="small muted">{a.email}</div></td>
                <td>{ROLES[a.role] ?? a.role}</td>
                {canManage ? (
                  <td className="num">
                    <button type="button" className="btn small danger" disabled={busy}
                      onClick={() => run(send("DELETE", `/api/v1/projects/${projectId}/members?userId=${a.user_id}`))}>Quitar</button>
                  </td>
                ) : null}
              </tr>
            ))}
            {assigned.length === 0 ? <tr><td colSpan={3} className="muted">Sin personas asignadas.</td></tr> : null}
          </tbody>
        </table>
      </div>
      {canManage && available.length > 0 ? (
        <div className="form-row">
          <div className="field">
            <label htmlFor="team-user">Asignar miembro de la organización</label>
            <select id="team-user" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {available.map((c) => <option key={c.user_id} value={c.user_id}>{c.name || c.email}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="team-role">Rol</label>
            <select id="team-role" value={role} onChange={(e) => setRole(e.target.value)}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn primary small" disabled={!userId || busy}
              onClick={() => run(send("POST", `/api/v1/projects/${projectId}/members`, { userId, role }))}>Asignar</button>
          </div>
        </div>
      ) : null}
      {error ? <div className="alert error" role="alert">{error}</div> : null}
    </div>
  );
}
