"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { localAmountMinor } from "@/lib/order-status";

type Account = { name: string; accountType: string; accountNumber: string; holder: string; document: string };

const PRESETS = [5, 10, 25, 50];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn small"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      type="button"
    >
      {copied ? "✓ Copiado" : "Copiar"}
    </button>
  );
}

export function BankTransferForm({ accounts, rate, currency, min, max }: { accounts: Account[]; rate: number; currency: string; min: number; max: number }) {
  const router = useRouter();
  const [bank, setBank] = useState(accounts[0]?.name ?? "");
  const [amount, setAmount] = useState("10");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const account = accounts.find((item) => item.name === bank) ?? accounts[0];
  const usdMinor = Math.round(Number(amount) * 100);
  const local = localAmountMinor(usdMinor, rate) / 100;
  const symbol = currency === "DOP" ? "RD$" : `${currency} `;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/payments/bank-transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bank, amount: Number(amount), reference, note }),
      });
      const result = (await response.json()) as { success?: boolean; id?: string; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "No fue posible registrar la transferencia.");
      setMessage(`Recibido (${result.id}). Verificaremos la transferencia y acreditaremos US$${Number(amount).toFixed(2)} en tu saldo.`);
      setReference("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la transferencia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3>🏦 Transferencia o depósito en {currency === "DOP" ? "pesos" : currency}</h3>
      <p className="muted" style={{ marginTop: 0 }}>Para clientes en República Dominicana. Sin comisiones.</p>

      <div className="field">
        <label htmlFor="bank">1. Elige el banco</label>
        <select id="bank" onChange={(event) => setBank(event.target.value)} value={bank}>
          {accounts.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="bt-amount">2. Monto a recargar (USD)</label>
        <div className="form-actions" style={{ marginBottom: 8 }}>
          {PRESETS.filter((value) => value >= min && value <= max).map((value) => (
            <button className={`btn small${Number(amount) === value ? " primary" : ""}`} key={value} onClick={() => setAmount(String(value))} type="button">US${value}</button>
          ))}
        </div>
        <input id="bt-amount" inputMode="decimal" max={max} min={min} onChange={(event) => setAmount(event.target.value)} required step="0.01" type="number" value={amount} />
      </div>

      {account ? (
        <div className="bank-box">
          <div className="bank-amount">
            <span className="muted">Transfiere exactamente</span>
            <strong>{symbol}{local.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</strong>
            <small className="muted">Tasa: {symbol}{rate} por US$1</small>
          </div>
          <div className="list">
            <div className="list-item"><span>Banco</span><strong>{account.name}</strong></div>
            <div className="list-item"><span>{account.accountType}</span><span style={{ display: "flex", gap: 8, alignItems: "center" }}><strong>{account.accountNumber}</strong><CopyButton value={account.accountNumber} /></span></div>
            {account.holder ? <div className="list-item"><span>Titular</span><strong>{account.holder}</strong></div> : null}
            {account.document ? <div className="list-item"><span>Cédula / RNC</span><strong>{account.document}</strong></div> : null}
          </div>
        </div>
      ) : null}

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="reference">3. Número de referencia o confirmación</label>
        <input id="reference" maxLength={80} minLength={3} onChange={(event) => setReference(event.target.value)} placeholder="Lo encuentras en el comprobante de tu banco" required value={reference} />
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="bt-note">Nota (opcional)</label>
        <input id="bt-note" maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: transferí desde BHD a nombre de Juan Pérez" value={note} />
      </div>
      <div className="form-actions" style={{ marginTop: 14 }}>
        <button className="btn primary" disabled={busy || !reference.trim()} type="submit">{busy ? "Enviando..." : "Ya transferí, verificar"}</button>
      </div>
      {message ? <div className="toast">{message}</div> : null}
      {error ? <div className="notice" style={{ marginTop: 12 }}>{error}</div> : null}
    </form>
  );
}
