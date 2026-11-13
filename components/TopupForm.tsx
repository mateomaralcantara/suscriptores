"use client";

import { FormEvent, useState } from "react";

const PRESETS = [10, 25, 50, 100];

export function TopupForm({ min, max }: { min: number; max: number }) {
  const [amount, setAmount] = useState("25");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const result = (await response.json()) as { success?: boolean; url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "No fue posible iniciar el pago.");
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar el pago.");
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3>Recargar con tarjeta</h3>
      <div className="form-actions" style={{ marginBottom: 14 }}>
        {PRESETS.filter((value) => value >= min && value <= max).map((value) => (
          <button className={`btn small${Number(amount) === value ? " primary" : ""}`} key={value} onClick={() => setAmount(String(value))} type="button">
            US${value}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="amount">Monto (USD)</label>
        <input id="amount" inputMode="decimal" max={max} min={min} onChange={(event) => setAmount(event.target.value)} required step="0.01" type="number" value={amount} />
        <small>Mínimo US${min} · máximo US${max.toLocaleString()}. El pago se procesa en Stripe; el saldo se acredita al confirmarse.</small>
      </div>
      <div className="form-actions" style={{ marginTop: 14 }}>
        <button className="btn primary" disabled={loading} type="submit">{loading ? "Redirigiendo a Stripe..." : "Pagar con tarjeta"}</button>
      </div>
      {error ? <div className="notice" style={{ marginTop: 12 }}>{error}</div> : null}
    </form>
  );
}
