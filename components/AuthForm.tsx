"use client";

import { FormEvent, useState } from "react";
import { apiRequest } from "@/lib/client/request";

/** Only same-site relative paths are accepted as a post-login destination. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/dashboard";
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const result = await apiRequest(`/api/auth/${mode}`, {
      method: "POST",
      body: { email: form.get("email"), password: form.get("password"), ...(mode === "register" ? { name: form.get("name") } : {}) },
    });
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    // Full navigation so the new session cookie is applied to every server component.
    window.location.assign(safeNext(new URLSearchParams(window.location.search).get("next")));
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      <div className="form-grid">
        {mode === "register" ? <div className="field full"><label htmlFor="name">Nombre completo</label><input autoComplete="name" id="name" maxLength={80} minLength={2} name="name" required /></div> : null}
        <div className="field full"><label htmlFor="email">Correo</label><input autoComplete="email" id="email" name="email" required type="email" /></div>
        <div className="field full"><label htmlFor="password">Contraseña</label><input autoComplete={mode === "login" ? "current-password" : "new-password"} id="password" minLength={mode === "register" ? 10 : undefined} name="password" required type="password" />{mode === "register" ? <small>Mínimo 10 caracteres, con letras y números.</small> : null}</div>
      </div>
      <div className="form-actions"><button className="btn primary" disabled={busy} type="submit">{busy ? "Procesando…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</button></div>
      {error ? <div className="toast error" role="alert">{error}</div> : null}
    </form>
  );
}
