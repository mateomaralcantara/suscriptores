"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type AuthKind = "login" | "register" | "forgot";

export function AuthForm({ kind }: { kind: AuthKind }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    };

    try {
      const response = await fetch(`/api/auth/${kind === "forgot" ? "forgot-password" : kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { ok?: boolean; error?: string; needsConfirmation?: boolean };
      if (!response.ok || !result.ok) throw new Error(result.error || "No fue posible completar la operación.");

      if (kind === "forgot") {
        setMessage("Si la cuenta existe, recibirás las instrucciones de recuperación por correo.");
        return;
      }
      if (kind === "register" && result.needsConfirmation) {
        setMessage("Cuenta creada. Revisa tu correo para confirmar el acceso.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      <div className="form-grid">
        {kind === "register" ? (
          <div className="field full">
            <label htmlFor="name">Nombre completo</label>
            <input id="name" name="name" required autoComplete="name" />
          </div>
        ) : null}
        <div className="field full">
          <label htmlFor="email">Correo</label>
          <input id="email" name="email" required type="email" autoComplete="email" />
        </div>
        {kind !== "forgot" ? (
          <div className="field full">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              required
              minLength={8}
              type="password"
              autoComplete={kind === "login" ? "current-password" : "new-password"}
            />
          </div>
        ) : null}
      </div>
      <div className="form-actions">
        <button className="btn primary" disabled={loading} type="submit">
          {loading ? "Procesando..." : kind === "login" ? "Iniciar sesión" : kind === "register" ? "Crear cuenta" : "Enviar recuperación"}
        </button>
      </div>
      {message ? <div className="toast">{message}</div> : null}
      {error ? <div className="notice">{error}</div> : null}
    </form>
  );
}
