"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { send } from "@/lib/client-api";

export type AuthKind = "login" | "register" | "forgot";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/inicio";
}

export function AuthForm({ kind }: { kind: AuthKind }) {
  const router = useRouter();
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const path = kind === "forgot" ? "forgot-password" : kind;
    const result = await send<{ needsConfirmation?: boolean }>("POST", `/api/auth/${path}`, data);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    if (kind === "forgot") return setMessage("Si la cuenta existe, recibirás instrucciones por correo.");
    if (kind === "register" && result.data?.needsConfirmation) {
      return setMessage("Cuenta creada. Confirma tu correo para continuar.");
    }
    router.replace(safeNext(search.get("next")));
    router.refresh();
  }

  return (
    <form className="card form" onSubmit={submit} noValidate={false}>
      {kind === "register" ? (
        <div className="field">
          <label htmlFor="name">Nombre completo</label>
          <input id="name" name="name" type="text" required minLength={2} maxLength={160} autoComplete="name" />
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      {kind !== "forgot" ? (
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" required minLength={kind === "register" ? 10 : 1}
            autoComplete={kind === "login" ? "current-password" : "new-password"} />
          {kind === "register" ? <span className="hint">Mínimo 10 caracteres.</span> : null}
        </div>
      ) : null}
      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Procesando…" : kind === "login" ? "Iniciar sesión" : kind === "register" ? "Crear cuenta" : "Enviar instrucciones"}
        </button>
      </div>
      {error ? <div className="alert error" role="alert">{error}</div> : null}
      {message ? <div className="alert success" role="status">{message}</div> : null}
    </form>
  );
}
