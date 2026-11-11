"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/client/request";

export function ApiKeyCard() {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  async function generate() {
    setError("");
    const result = await apiRequest<{ apiKey: string }>("/api/auth/api-key", { method: "POST" });
    if (result.ok) setApiKey(result.data.apiKey);
    else setError(result.message);
  }

  return <>
    <p className="muted">Envía tu clave en el encabezado <code>Authorization: Bearer</code>. Generar una nueva invalida la anterior y solo se muestra una vez.</p>
    <div className="form-actions"><button className="btn primary" onClick={generate} type="button">Generar API key</button></div>
    {apiKey ? <div className="code" style={{ marginTop: 12, wordBreak: "break-all" }}>{apiKey}</div> : null}
    {error ? <div className="toast error" role="alert">{error}</div> : null}
  </>;
}
