"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { send } from "@/lib/client-api";

type Member = { user_id: string; role_code: string; email: string; name: string; isMe: boolean };
type Role = { code: string; name: string; description: string };

export function MembersManager({ orgId, members, roles, canManage }: { orgId: string; members: Member[]; roles: Role[]; canManage: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("investigador");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const roleName = (code: string) => roles.find((r) => r.code === code)?.name ?? code;

  async function run(promise: Promise<{ ok: boolean; error?: string }>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    const result = await promise;
    setBusy(false);
    if (!result.ok) return setError(result.error ?? "Error");
    setNotice(success);
    router.refresh();
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    await run(send("POST", `/api/v1/organizations/${orgId}/members`, { email, role }), "Miembro agregado.");
    setEmail("");
  }

  return (
    <div className="stack">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Persona</th><th>Rol</th>{canManage ? <th className="num">Acciones</th> : null}</tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.user_id}>
                <td>{m.name || m.email}{m.isMe ? <span className="badge neutral" style={{ marginLeft: 6 }}>tú</span> : null}<div className="small muted">{m.email}</div></td>
                <td>
                  {canManage ? (
                    <select aria-label={`Rol de ${m.email}`} value={m.role_code} disabled={busy}
                      onChange={(e) => run(send("PATCH", `/api/v1/organizations/${orgId}/members/${m.user_id}`, { role: e.target.value }), "Rol actualizado.")}>
                      {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                    </select>
                  ) : roleName(m.role_code)}
                </td>
                {canManage ? (
                  <td className="num">
                    <button type="button" className="btn small danger" disabled={busy}
                      onClick={() => {
                        if (window.confirm(`¿Retirar a ${m.email} de la organización y de sus proyectos?`)) {
                          void run(send("DELETE", `/api/v1/organizations/${orgId}/members/${m.user_id}`), "Miembro retirado.");
                        }
                      }}>Retirar</button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canManage ? (
        <form className="form-row" onSubmit={add}>
          <div className="field">
            <label htmlFor="member-email">Correo de una cuenta registrada</label>
            <input id="member-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="member-role">Rol</label>
            <select id="member-role" value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
            </select>
            <span className="hint">{roles.find((r) => r.code === role)?.description}</span>
          </div>
          <div className="form-actions"><button className="btn primary small" type="submit" disabled={busy}>Agregar miembro</button></div>
        </form>
      ) : null}
      {error ? <div className="alert error" role="alert">{error}</div> : null}
      {notice ? <div className="alert success" role="status">{notice}</div> : null}
    </div>
  );
}
