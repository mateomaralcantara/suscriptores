"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = (await response.json()) as { success?: boolean; error?: string; status?: string; available?: number };
  if (!response.ok || !result.success) throw new Error(result.error || "La operación no pudo completarse.");
  return result;
}

export function AdjustBalanceForm({ users }: { users: { id: string; email: string }[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const amount = Number(data.get("amount"));
    const email = users.find((user) => user.id === data.get("profileId"))?.email ?? "";
    if (!window.confirm(`¿${amount > 0 ? "Acreditar" : "Debitar"} US$${Math.abs(amount).toFixed(2)} a ${email}?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await postJson("/api/admin/wallets/adjust", { profileId: data.get("profileId"), amount, reason: data.get("reason") });
      setMessage(`Saldo actualizado. Disponible: US$${result.available?.toFixed(2)}.`);
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3>Ajustar saldo</h3>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="profileId">Usuario</label>
          <select id="profileId" name="profileId" required>
            {users.map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="amount">Monto USD (negativo para debitar)</label>
          <input id="amount" name="amount" required step="0.01" type="number" />
        </div>
        <div className="field">
          <label htmlFor="reason">Motivo (queda en auditoría)</label>
          <input id="reason" maxLength={500} name="reason" required />
        </div>
      </div>
      <div className="form-actions" style={{ marginTop: 12 }}>
        <button className="btn primary" disabled={busy} type="submit">{busy ? "Guardando..." : "Aplicar ajuste"}</button>
      </div>
      {message ? <div className="notice" style={{ marginTop: 12 }}>{message}</div> : null}
    </form>
  );
}

export function ResolveOrderForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [providerOrderId, setProviderOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function resolve(withProviderId: boolean) {
    const question = withProviderId
      ? `¿Confirmar el pedido con el ID de proveedor ${providerOrderId}? Se cobrará al cliente.`
      : "¿Marcar como NO creado en el proveedor? Se devolverá el saldo reservado al cliente.";
    if (!window.confirm(question)) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await postJson(`/api/admin/orders/${orderId}/resolve`, { providerOrderId: withProviderId ? providerOrderId : "" });
      setMessage(`Resuelto: ${result.status}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6, minWidth: 220 }}>
      <input aria-label="ID del pedido en el proveedor" onChange={(event) => setProviderOrderId(event.target.value)} placeholder="ID en el proveedor" value={providerOrderId} />
      <div className="form-actions">
        <button className="btn small primary" disabled={busy || !providerOrderId.trim()} onClick={() => resolve(true)} type="button">Confirmar</button>
        <button className="btn small danger" disabled={busy} onClick={() => resolve(false)} type="button">No existe: devolver</button>
      </div>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
