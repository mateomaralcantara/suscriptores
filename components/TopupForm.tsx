"use client";

import { FormEvent, useState } from "react";

const PRESETS = [10, 25, 50, 100];

export type TopupMethod = "crypto" | "card";

const METHODS: Record<TopupMethod, { label: string; endpoint: string; button: string; note: string }> = {
  crypto: {
    label: "₿ Criptomonedas (USDT, BTC, ETH y más)",
    endpoint: "/api/payments/crypto",
    button: "Pagar con cripto",
    note: "Pagas en NOWPayments con la moneda que elijas. El saldo se acredita solo cuando la red confirma el pago (de minutos a una hora).",
  },
  card: {
    label: "💳 Tarjeta",
    endpoint: "/api/payments/checkout",
    button: "Pagar con tarjeta",
    note: "El pago se procesa en Stripe; el saldo se acredita al confirmarse.",
  },
};

export function TopupForm({ min, max, methods }: { min: number; max: number; methods: TopupMethod[] }) {
  const [method, setMethod] = useState<TopupMethod>(methods[0]);
  const [amount, setAmount] = useState("25");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const config = METHODS[method];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(config.endpoint, {
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
      <h3>Recargar saldo</h3>
      {methods.length > 1 ? (
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="method">Método de pago</label>
          <select id="method" onChange={(event) => setMethod(event.target.value as TopupMethod)} value={method}>
            {methods.map((item) => <option key={item} value={item}>{METHODS[item].label}</option>)}
          </select>
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 0 }}>{config.label}</p>
      )}
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
        <small>Mínimo US${min} · máximo US${max.toLocaleString()}. {config.note}</small>
      </div>
      <div className="form-actions" style={{ marginTop: 14 }}>
        <button className="btn primary" disabled={loading} type="submit">{loading ? "Redirigiendo..." : config.button}</button>
      </div>
      {error ? <div className="notice" style={{ marginTop: 12 }}>{error}</div> : null}
    </form>
  );
}
