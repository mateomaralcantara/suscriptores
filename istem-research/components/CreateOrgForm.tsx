"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { send } from "@/lib/client-api";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export function CreateOrgForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await send<{ id: string }>("POST", "/api/v1/organizations", { name, slug, countryCode: "DO" });
    if (!result.ok) {
      setBusy(false);
      return setError(result.error);
    }
    await send("POST", "/api/session/organization", { organizationId: result.data.id });
    router.replace("/inicio");
    router.refresh();
  }

  return (
    <form className="card form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="org-name">Nombre de la organización</label>
        <input id="org-name" type="text" required minLength={2} maxLength={160} value={name}
          onChange={(e) => { setName(e.target.value); if (!touched) setSlug(slugify(e.target.value)); }} />
      </div>
      <div className="field">
        <label htmlFor="org-slug">Identificador</label>
        <input id="org-slug" type="text" required pattern="[a-z0-9][a-z0-9-]{1,46}[a-z0-9]" value={slug}
          onChange={(e) => { setTouched(true); setSlug(e.target.value); }} />
        <span className="hint">Minúsculas, números y guiones. Será su identificador permanente.</span>
      </div>
      <p className="small muted">Quedarás como director(a) de investigación. La organización se crea sin plan de pago: ningún servicio con costo se activa sin autorización expresa de un administrador.</p>
      <div className="form-actions">
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "Creando…" : "Crear organización"}</button>
      </div>
      {error ? <div className="alert error" role="alert">{error}</div> : null}
    </form>
  );
}
