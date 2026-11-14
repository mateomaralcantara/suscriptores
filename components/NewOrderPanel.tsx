"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderService } from "@/lib/order-services";
import { iconForPlatform, orderPlatforms } from "@/lib/order-services";
import { formatDuration } from "@/lib/order-status";

const PLATFORM_LABELS: Record<string, string> = {
  All: "Todo",
  Twitter: "X",
  Traffic: "Tráfico",
  Other: "Otro",
};
const label = (platform: string) => PLATFORM_LABELS[platform] ?? platform;
const ALL_CATEGORIES = "__all__";

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `order-${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function NewOrderPanel() {
  const router = useRouter();
  const [services, setServices] = useState<OrderService[]>([]);
  const [ordersEnabled, setOrdersEnabled] = useState(false);
  const [pricing, setPricing] = useState<{ kind: string; discount: number }>({ kind: "list", discount: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [platform, setPlatform] = useState("All");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [serviceId, setServiceId] = useState("");
  // Raw text so the customer can type freely; null means "use the service minimum".
  const [quantityText, setQuantityText] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [dripFeed, setDripFeed] = useState(false);
  const [runs, setRuns] = useState(2);
  const [interval, setIntervalMinutes] = useState(60);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/v1/services", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as { success?: boolean; services?: OrderService[]; ordersEnabled?: boolean; error?: string; pricing?: string; discountPercent?: number };
        if (!response.ok || !result.success) throw new Error(result.error || "No fue posible cargar los servicios.");
        if (!active) return;
        setServices(result.services ?? []);
        setOrdersEnabled(Boolean(result.ordersEnabled));
        setPricing({ kind: result.pricing ?? "list", discount: result.discountPercent ?? 0 });
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar los servicios.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Only show platform buttons that actually have services.
  const platforms = useMemo(() => orderPlatforms.filter((item) => item === "All" || services.some((service) => service.platform === item)), [services]);

  const searched = useMemo(() => {
    const term = search.trim().toLowerCase();
    return services.filter((service) => {
      const matchesPlatform = platform === "All" || service.platform === platform;
      const matchesSearch = !term || `${service.id} ${service.name} ${service.category}`.toLowerCase().includes(term);
      return matchesPlatform && matchesSearch;
    });
  }, [services, platform, search]);

  const categories = useMemo(() => Array.from(new Set(searched.map((service) => service.category))), [searched]);
  const activeCategory = category !== ALL_CATEGORIES && categories.includes(category) ? category : ALL_CATEGORIES;
  const filtered = useMemo(
    () => (activeCategory === ALL_CATEGORIES ? searched : searched.filter((service) => service.category === activeCategory)),
    [searched, activeCategory],
  );

  const selected = filtered.find((service) => service.id === serviceId) ?? filtered[0] ?? null;
  const quantityValue = quantityText ?? String(selected?.min ?? "");
  const qty = Number(quantityValue);
  const quantityError = !selected
    ? ""
    : !Number.isInteger(qty) || quantityValue.trim() === ""
      ? "Escribe una cantidad entera."
      : qty < selected.min || qty > selected.max
        ? `Debe estar entre ${selected.min.toLocaleString()} y ${selected.max.toLocaleString()}.`
        : "";
  const useDripFeed = Boolean(selected?.dripfeed && dripFeed);
  const totalUnits = useDripFeed ? qty * runs : qty;
  const charge = selected && !quantityError ? (totalUnits / 1000) * selected.rate : 0;

  function resetFor(next: OrderService | undefined) {
    setServiceId(next?.id ?? "");
    setQuantityText(null);
    setDripFeed(false);
    setMessage("");
    setError("");
  }

  function choosePlatform(next: string) {
    setPlatform(next);
    setCategory(ALL_CATEGORIES);
    resetFor(services.find((service) => next === "All" || service.platform === next));
  }

  function chooseCategory(next: string) {
    setCategory(next);
    resetFor(searched.find((service) => next === ALL_CATEGORIES || service.category === next));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    if (!ordersEnabled) {
      setError("Los pedidos reales aún no están habilitados en el servidor.");
      return;
    }
    if (quantityError) {
      setError(`Cantidad: ${quantityError}`);
      return;
    }
    setSubmitting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ serviceId: selected.id, link, quantity: qty, idempotencyKey: newKey(), ...(useDripFeed ? { runs, interval } : {}) }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string; order?: { publicId?: string } };
      if (!response.ok || !result.success) throw new Error(result.error || "No fue posible crear el pedido.");
      const publicId = result.order?.publicId;
      setMessage(publicId ? `Pedido ${publicId} creado correctamente.` : "Pedido creado correctamente.");
      if (publicId) {
        router.push(`/orders/${encodeURIComponent(publicId)}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="card order-card">Cargando servicios...</div>;
  if (services.length === 0) {
    return (
      <div className="card order-card">
        <strong>No hay servicios disponibles.</strong>
        {error ? <div className="notice" style={{ marginTop: 12 }}>{error}</div> : null}
      </div>
    );
  }

  return (
    <form className="card order-card" onSubmit={submit}>
      <div className="platform-grid" role="group" aria-label="Plataforma">
        {platforms.map((item) => (
          <button className={platform === item ? "platform-btn active" : "platform-btn"} key={item} onClick={() => choosePlatform(item)} type="button">
            <span aria-hidden="true">{item === "All" ? "☰" : iconForPlatform(item)}</span> {label(item)}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="service-search">Buscar</label>
        <input id="service-search" onChange={(event) => { setSearch(event.target.value); setCategory(ALL_CATEGORIES); }} placeholder="🔍  ID, nombre o categoría" value={search} />
      </div>

      <div className="field">
        <label htmlFor="category">Categoría</label>
        <select id="category" onChange={(event) => chooseCategory(event.target.value)} value={activeCategory}>
          <option value={ALL_CATEGORIES}>Todas las categorías ({searched.length})</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="service">Servicio</label>
        {selected ? (
          <select id="service" onChange={(event) => resetFor(filtered.find((service) => service.id === event.target.value))} value={selected.id}>
            {filtered.map((service) => (
              <option key={service.id} value={service.id}>
                {service.id} — {service.name} — US${service.rate.toFixed(4)} / 1000
              </option>
            ))}
          </select>
        ) : (
          <div className="notice">Ningún servicio coincide con la búsqueda.</div>
        )}
      </div>

      {selected ? (
        <>
          <div className="field">
            <label>Descripción</label>
            <div className="service-description">
              <strong>{selected.name}</strong>
              <div className="service-tags">
                <span className="badge">{selected.category}</span>
                <span className={selected.refill ? "badge active" : "badge"}>{selected.refill ? "♻️ Con refill" : "Sin refill"}</span>
                <span className={selected.cancel ? "badge active" : "badge"}>{selected.cancel ? "Cancelable" : "No cancelable"}</span>
                {selected.dripfeed ? <span className="badge active">Drip-feed</span> : null}
                <span className="badge">US${selected.rate.toFixed(4)} / 1000</span>
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="link">Enlace</label>
            <input id="link" onChange={(event) => setLink(event.target.value)} placeholder="https://..." required type="url" value={link} />
          </div>

          <div className="field">
            <label htmlFor="quantity">Cantidad</label>
            <input
              aria-invalid={Boolean(quantityError)}
              id="quantity"
              inputMode="numeric"
              max={selected.max}
              min={selected.min}
              onChange={(event) => setQuantityText(event.target.value)}
              required
              step={1}
              type="number"
              value={quantityValue}
            />
            <small>Mínimo: {selected.min.toLocaleString()} · Máximo: {selected.max.toLocaleString()}</small>
            {quantityError ? <small className="field-error">{quantityError}</small> : null}
          </div>

          {selected.dripfeed ? (
            <div className="field">
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input checked={dripFeed} onChange={(event) => setDripFeed(event.target.checked)} type="checkbox" /> Drip-feed (entregar en varias tandas)
              </label>
              {dripFeed ? (
                <div className="form-grid" style={{ marginTop: 8 }}>
                  <div className="field">
                    <label htmlFor="runs">Tandas</label>
                    <input id="runs" max={100} min={2} onChange={(event) => setRuns(Number(event.target.value))} type="number" value={runs} />
                  </div>
                  <div className="field">
                    <label htmlFor="interval">Minutos entre tandas</label>
                    <input id="interval" max={1440} min={1} onChange={(event) => setIntervalMinutes(Number(event.target.value))} type="number" value={interval} />
                  </div>
                  <small className="field full">Se entregan {qty.toLocaleString()} en cada tanda: {totalUnits.toLocaleString()} en total.</small>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="field">
            <label title="Tiempo medio de los últimos 10 pedidos completados de este servicio">Tiempo promedio ⓘ</label>
            <input readOnly value={formatDuration(selected.averageMinutes)} />
          </div>

          <div className="field">
            <label>Cargo</label>
            <input className="charge-input" readOnly value={`US$${charge.toFixed(4)}`} />
            {pricing.kind === "admin" ? <small>👑 Precio de administrador: pagas el coste del proveedor, sin margen.</small> : null}
            {pricing.kind === "discount" ? <small>🏷️ Incluye tu descuento del {pricing.discount}%.</small> : null}
          </div>

          <button className="btn primary submit-order" disabled={submitting || !ordersEnabled || Boolean(quantityError)} type="submit">
            {submitting ? "Procesando..." : ordersEnabled ? "Realizar pedido" : "Pedidos deshabilitados"}
          </button>
        </>
      ) : null}

      {!ordersEnabled ? <div className="notice">El catálogo es real, pero los pedidos están bloqueados hasta activar SMM_LIVE_ORDERS_ENABLED=true.</div> : null}
      {message ? <div className="toast">{message}</div> : null}
      {error ? <div className="notice">{error}</div> : null}
    </form>
  );
}
