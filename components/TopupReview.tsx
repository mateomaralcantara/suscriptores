"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TopupReview({ requestId, label }: { requestId: string; label: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function review(approve: boolean) {
    if (approve && !window.confirm(`¿Confirmas que el dinero está en tu cuenta? Se acreditará ${label} al cliente.`)) return;
    if (!approve && !reason.trim()) {
      setError("Escribe el motivo del rechazo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/topups/${requestId}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approve, reason }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "No fue posible revisar la solicitud.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6, minWidth: 230 }}>
      <div className="form-actions">
        <button className="btn small primary" disabled={busy} onClick={() => review(true)} type="button">✓ Aprobar</button>
        <button className="btn small danger" disabled={busy} onClick={() => review(false)} type="button">✗ Rechazar</button>
      </div>
      <input aria-label="Motivo" onChange={(event) => setReason(event.target.value)} placeholder="Motivo (obligatorio si rechazas)" value={reason} />
      {error ? <small className="field-error">{error}</small> : null}
    </div>
  );
}
