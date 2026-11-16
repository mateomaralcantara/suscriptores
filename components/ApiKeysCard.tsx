"use client";

import { useCallback, useEffect, useState } from "react";

type Key = { id: string; name: string; key_prefix: string; last_used_at: string | null; created_at: string };

export function ApiKeysCard({ apiUrl }: { apiUrl: string }) {
  const [keys, setKeys] = useState<Key[]>([]);
  const [newKey, setNewKey] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/account/api-keys", { cache: "no-store" });
    const result = (await response.json()) as { data?: Key[] };
    return result.data ?? [];
  }, []);

  useEffect(() => {
    let active = true;
    load()
      .then((list) => { if (active) setKeys(list); })
      .catch(() => { if (active) setError("No fue posible cargar las claves."); });
    return () => { active = false; };
  }, [load]);

  async function create() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/api-keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      const result = (await response.json()) as { key?: string; error?: string };
      if (!response.ok || !result.key) throw new Error(result.error || "No fue posible crear la clave.");
      setNewKey(result.key);
      setName("");
      setKeys(await load());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(key: Key) {
    if (!window.confirm(`¿Revocar la clave "${key.name}"? Las integraciones que la usen dejarán de funcionar.`)) return;
    await fetch(`/api/account/api-keys?id=${key.id}`, { method: "DELETE" });
    setKeys(await load());
  }

  return (
    <section className="card">
      <h3>API para revendedores</h3>
      <p className="muted">
        Conecta otro panel con la URL <code>{apiUrl}</code> y una clave. Formato estándar API v2: services, add, status, balance, refill y cancel.
      </p>
      {newKey ? (
        <div className="toast">
          Copia tu clave ahora; no se volverá a mostrar:
          <pre className="code" style={{ userSelect: "all", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{newKey}</pre>
        </div>
      ) : null}
      <div className="list" style={{ margin: "12px 0" }}>
        {keys.length === 0 ? <span className="muted">No tienes claves activas.</span> : null}
        {keys.map((key) => (
          <div className="list-item" key={key.id}>
            <span>
              {key.name} · <code>gr_{key.key_prefix}_…</code>
              <br />
              <small className="muted">Último uso: {key.last_used_at ? new Date(key.last_used_at).toLocaleString("es-DO") : "nunca"}</small>
            </span>
            <button className="btn small danger" onClick={() => revoke(key)} type="button">Revocar</button>
          </div>
        ))}
      </div>
      <div className="form-actions">
        <input aria-label="Nombre de la clave" maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="Nombre (ej. Mi panel)" value={name} />
        <button className="btn primary" disabled={busy} onClick={create} type="button">Crear clave</button>
      </div>
      {error ? <div className="notice" style={{ marginTop: 12 }}>{error}</div> : null}
    </section>
  );
}
