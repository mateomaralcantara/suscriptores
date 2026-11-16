"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Pedidos", "Pagos", "API", "Refill", "Cuenta", "Otro"];
const PRIORITIES = ["Baja", "Media", "Alta"];

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = (await response.json()) as { success?: boolean; error?: string; id?: string };
  if (!response.ok || !result.success) throw new Error(result.error || "No fue posible completar la operación.");
  return result;
}

export function NewTicketForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await postJson("/api/tickets", {
        subject: data.get("subject"), category: data.get("category"), priority: data.get("priority"), message: data.get("message"),
      });
      router.push(`/tickets/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error.");
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="form-grid">
        <div className="field full"><label htmlFor="subject">Asunto</label><input id="subject" maxLength={200} name="subject" required /></div>
        <div className="field"><label htmlFor="category">Categoría</label><select id="category" name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label htmlFor="priority">Prioridad</label><select defaultValue="Media" id="priority" name="priority">{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></div>
        <div className="field full"><label htmlFor="message">Mensaje</label><textarea id="message" maxLength={5000} name="message" placeholder="Incluye el ID del pedido si aplica." required rows={6} /></div>
      </div>
      <div className="form-actions" style={{ marginTop: 12 }}><button className="btn primary" disabled={busy} type="submit">{busy ? "Enviando..." : "Crear ticket"}</button></div>
      {error ? <div className="notice" style={{ marginTop: 12 }}>{error}</div> : null}
    </form>
  );
}

export function TicketReply({ ticketId, isStaff, closed }: { ticketId: string; isStaff: boolean; closed: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      setMessage("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  const id = encodeURIComponent(ticketId);
  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(() => postJson(`/api/tickets/${id}/messages`, { message, internal }));
  };
  const setStatus = (status: string) => run(() => postJson(`/api/tickets/${id}/status`, { status }));

  if (closed && !isStaff) return <div className="notice">Este ticket está cerrado. Si necesitas más ayuda, abre uno nuevo.</div>;

  return (
    <form onSubmit={send}>
      <div className="field"><label htmlFor="reply">Responder</label><textarea id="reply" maxLength={5000} onChange={(e) => setMessage(e.target.value)} required rows={4} value={message} /></div>
      {isStaff ? <label style={{ display: "flex", gap: 8, marginTop: 8 }}><input checked={internal} onChange={(e) => setInternal(e.target.checked)} type="checkbox" /> Nota interna (no la ve el cliente)</label> : null}
      <div className="form-actions" style={{ marginTop: 12 }}>
        <button className="btn primary" disabled={busy || !message.trim()} type="submit">Enviar</button>
        {isStaff && closed ? <button className="btn" disabled={busy} onClick={() => setStatus("open")} type="button">Reabrir</button> : null}
        {!closed ? <button className="btn" disabled={busy} onClick={() => setStatus("closed")} type="button">Cerrar ticket</button> : null}
      </div>
      {error ? <div className="notice" style={{ marginTop: 12 }}>{error}</div> : null}
    </form>
  );
}
