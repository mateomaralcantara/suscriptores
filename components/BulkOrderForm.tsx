"use client";

import { FormEvent, useState } from "react";

type Row = { line: number; ok: boolean; order?: string; cost?: number; error?: string };

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export function BulkOrderForm({ enabled }: { enabled: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Row[]>([]);
  const [batchKey, setBatchKey] = useState(newKey);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResults([]);
    try {
      const response = await fetch("/api/v1/orders/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, batchKey }),
      });
      const result = (await response.json()) as { error?: string; errors?: { line: number; error: string }[]; results?: Row[] };
      if (result.errors?.length) setError(result.errors.map((e) => (e.line ? `Línea ${e.line}: ${e.error}` : e.error)).join(" · "));
      else if (!result.results) setError(result.error || "No fue posible procesar el lote.");
      setResults(result.results ?? []);
      // New key only once the batch was processed: resubmitting after a network error is safe.
      if (result.results) setBatchKey(newKey());
    } catch {
      setError("No fue posible enviar el lote. Puedes reintentar sin riesgo de cobro doble.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="field">
        <label htmlFor="bulk">Un pedido por línea: <code>ID de servicio | enlace | cantidad</code></label>
        <textarea
          id="bulk"
          onChange={(event) => setText(event.target.value)}
          placeholder={"1234 | https://instagram.com/p/abc | 1000\n5678 | https://tiktok.com/@usuario/video/1 | 500"}
          required
          rows={10}
          style={{ fontFamily: "monospace" }}
          value={text}
        />
        <small>Máximo 100 líneas. Cada pedido reserva su saldo por separado; si el saldo se agota, el resto no se envía.</small>
      </div>
      <div className="form-actions" style={{ marginTop: 12 }}>
        <button className="btn primary" disabled={busy || !enabled} type="submit">{busy ? "Procesando..." : "Enviar lote"}</button>
      </div>
      {!enabled ? <div className="notice" style={{ marginTop: 12 }}>Los pedidos reales aún no están habilitados en el servidor.</div> : null}
      {error ? <div className="notice" style={{ marginTop: 12 }}>{error}</div> : null}
      {results.length > 0 ? (
        <div className="list" style={{ marginTop: 12 }}>
          {results.map((row) => (
            <div className="list-item" key={row.line}>
              <span>Línea {row.line}</span>
              <strong>{row.ok ? `✓ ${row.order} · US$${row.cost?.toFixed(2)}` : `✗ ${row.error}`}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </form>
  );
}
