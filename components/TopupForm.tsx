"use client";

import { FormEvent, useState } from "react";

const PRESETS = [10, 25, 50, 100];

export type TopupMethod = "crypto" | "card";

const METHODS: Record<TopupMethod, { label: string; endpoint: string; button: string; note: string }> = {
  crypto: {
    label: "₿ Criptomonedas (USDT, BTC, ETH y más)",
    endpoint: "/api/payments/crypto",
    button: "Pagar con USDT / cripto",
    note: "Pagas en NOWPayments desde tu wallet o exchange (Binance, etc.). El saldo se acredita solo cuando la red confirma el pago, normalmente en minutos.",
  },
  card: {
    label: "💳 Tarjeta",
    endpoint: "/api/payments/checkout",
    button: "Pagar con tarjeta",
    note: "El pago se procesa en Stripe; el saldo se acredita al confirmarse.",
  },
};

export function TopupForm({ min: baseMin, max, methods, cryptoLabel, cryptoMin }: { min: number; max: number; methods: TopupMethod[]; cryptoLabel?: string; cryptoMin?: number }) {
  const [method, setMethod] = useState<TopupMethod>(methods[0]);
  const [amount, setAmount] = useState("25");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const labelFor = (item: TopupMethod) => (item === "crypto" && cryptoLabel ? `₿ ${cryptoLabel}` : METHODS[item].label);
  const config = METHODS[method];
  // Crypto has a higher minimum (NOWPayments rejects small amounts).
  const minFor = (item: TopupMethod) => (item === "crypto" && cryptoMin ? Math.max(cryptoMin, baseMin) : baseMin);
  const min = minFor(method);

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
          <select id="method" onChange={(event) => {
            const next = event.target.value as TopupMethod;
            setMethod(next);
            if (Number(amount) < minFor(next)) setAmount(String(minFor(next)));
          }} value={method}>
            {methods.map((item) => <option key={item} value={item}>{labelFor(item)}</option>)}
          </select>
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 0 }}>{labelFor(method)}</p>
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
