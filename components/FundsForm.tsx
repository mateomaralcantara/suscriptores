"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiRequest } from "@/lib/client/request";

export function FundsForm() {
  const router = useRouter();
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(new FormData(event.currentTarget).get("amount"));
    setBusy(true);
    const result = await apiRequest<{ data: { balanceAfter: number } }>("/api/payments", { method: "POST", body: { amount } });
    setNotice(result.ok ? { text: `Depósito sandbox acreditado. Nuevo saldo: US$${result.data.data.balanceAfter.toFixed(2)}.`, error: false } : { text: result.message, error: true });
    setBusy(false);
    if (result.ok) router.refresh();
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      <div className="form-grid"><div className="field"><label htmlFor="amount">Monto (USD)</label><input defaultValue="100" id="amount" max="10000" min="1" name="amount" required step="0.01" type="number" /></div></div>
      <div className="form-actions"><button className="btn primary" disabled={busy} type="submit">Acreditar en sandbox</button></div>
      {notice ? <div className={notice.error ? "toast error" : "toast"} role="status">{notice.text}</div> : null}
    </form>
  );
}
