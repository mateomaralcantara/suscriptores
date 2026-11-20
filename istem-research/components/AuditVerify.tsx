"use client";

import { useState } from "react";

type Integrity = { ok: boolean; checked: number; broken_at: number | null };

export function AuditVerify({ orgId }: { orgId: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Integrity | null>(null);
  const [error, setError] = useState("");

  async function verify() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/v1/organizations/${orgId}/audit?verify=1&limit=1`);
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; integrity?: Integrity; error?: string };
    setBusy(false);
    if (!response.ok || !payload.integrity) return setError(payload.error ?? "No se pudo verificar.");
    setResult(payload.integrity);
  }

  return (
    <div>
      <button type="button" className="btn small" disabled={busy} onClick={verify}>{busy ? "Verificando…" : "Verificar integridad de la cadena"}</button>
      {result ? (
        <div className={`alert ${result.ok ? "success" : "error"}`} role="status">
          {result.ok
            ? `Cadena íntegra: ${result.checked} registros verificados con SHA-256.`
            : `Se detectó una alteración en el registro #${result.broken_at}. Escale el incidente.`}
        </div>
      ) : null}
      {error ? <div className="alert error" role="alert">{error}</div> : null}
    </div>
  );
}
