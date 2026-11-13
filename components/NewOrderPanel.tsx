"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderService } from "@/lib/order-services";
import { orderPlatforms } from "@/lib/order-services";

export function NewOrderPanel() {
  const router = useRouter();
  const [services, setServices] = useState<OrderService[]>([]);
  const [ordersEnabled, setOrdersEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [platform, setPlatform] = useState("All");
  const [search, setSearch] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [quantity, setQuantity] = useState(0);
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
        const result = await response.json() as {
          success?: boolean;
          services?: OrderService[];
          ordersEnabled?: boolean;
          error?: string;
        };
        if (!response.ok || !result.success) throw new Error(result.error || "No fue posible cargar los servicios.");
        if (!active) return;
        const list = result.services ?? [];
        setServices(list);
        setOrdersEnabled(Boolean(result.ordersEnabled));
        if (list[0]) {
          setServiceId(list[0].id);
          setQuantity(list[0].min);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar los servicios.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return services.filter((service) => {
      const matchesPlatform = platform === "All" || service.platform === platform;
      const matchesSearch = !term || `${service.id} ${service.name} ${service.description} ${service.category}`.toLowerCase().includes(term);
      return matchesPlatform && matchesSearch;
    });
  }, [services, platform, search]);

  const selected = services.find((service) => service.id === serviceId) ?? filteredServices[0] ?? null;
  const useDripFeed = Boolean(selected?.dripfeed && dripFeed);
  const totalUnits = useDripFeed ? quantity * runs : quantity;
  const charge = selected ? Math.max(0, (totalUnits / 1000) * selected.rate) : 0;

  function selectPlatform(nextPlatform: string) {
    setPlatform(nextPlatform);
    const first = services.find((service) => nextPlatform === "All" || service.platform === nextPlatform);
    if (first) {
      setServiceId(first.id);
      setQuantity(first.min);
    }
    setMessage("");
    setError("");
  }

  function selectService(nextId: string) {
    const next = services.find((service) => service.id === nextId);
    if (!next) return;
    setServiceId(next.id);
    setQuantity(next.min);
    setDripFeed(false);
    setMessage("");
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    if (!ordersEnabled) {
      setError("Los pedidos reales aún no están habilitados en el servidor.");
      return;
    }
    if (quantity < selected.min || quantity > selected.max) {
      setError(`La cantidad debe estar entre ${selected.min.toLocaleString()} y ${selected.max.toLocaleString()}.`);
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");
    try {
      const idempotencyKey = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `order-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ serviceId: selected.id, link, quantity, idempotencyKey, ...(useDripFeed ? { runs, interval } : {}) }),
      });
      const result = await response.json() as {
        success?: boolean;
        error?: string;
        order?: { publicId?: string };
        orderId?: string;
      };
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

  if (loading) return <div className="card">Cargando catálogo del proveedor...</div>;
  if (!selected) return <div className="card"><strong>No hay servicios disponibles.</strong>{error ? <div className="notice">{error}</div> : null}</div>;

  return (
    <div className="order-workspace">
      <section className="platform-tabs" aria-label="Filtrar por plataforma">
        {orderPlatforms.map((item) => (
          <button className={platform === item ? "platform-tab active" : "platform-tab"} key={item} onClick={() => selectPlatform(item)} type="button">
            {item}
          </button>
        ))}
      </section>

      <form className="card order-card" onSubmit={submit}>
        <div className="order-search-row">
          <div className="field">
            <label htmlFor="service-search">Buscar</label>
            <input id="service-search" onChange={(event) => setSearch(event.target.value)} placeholder="ID, categoría o servicio" value={search} />
          </div>
          <div className="field">
            <label htmlFor="platform">Plataforma</label>
            <select id="platform" onChange={(event) => selectPlatform(event.target.value)} value={platform}>
              {orderPlatforms.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="field full">
          <label htmlFor="service">Servicio</label>
          <select id="service" onChange={(event) => selectService(event.target.value)} value={selected.id}>
            {filteredServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.icon} {service.id} - {service.name} - US${service.rate.toFixed(4)} / 1000
              </option>
            ))}
          </select>
          <small className="result-count">{filteredServices.length} servicios disponibles</small>
        </div>

        <div className="service-summary">
          <div><span>ID</span><strong>{selected.id}</strong></div>
          <div><span>Plataforma</span><strong>{selected.platform}</strong></div>
          <div><span>Tarifa</span><strong>US${selected.rate.toFixed(4)} / 1000</strong></div>
          <div><span>Refill / Cancelación</span><strong>{selected.refill ? "Refill" : "Sin refill"} · {selected.cancel ? "Cancelable" : "No cancelable"}</strong></div>
        </div>

        <div className="field full">
          <label>Descripción</label>
          <div className="service-description">{selected.description}</div>
        </div>

        <div className="form-grid">
          <div className="field full">
            <label htmlFor="link">URL objetivo</label>
            <input id="link" onChange={(event) => setLink(event.target.value)} placeholder="https://..." required type="url" value={link} />
          </div>
          <div className="field">
            <label htmlFor="quantity">Cantidad</label>
            <input id="quantity" max={selected.max} min={selected.min} onChange={(event) => setQuantity(Number(event.target.value))} required type="number" value={quantity} />
            <small>Min: {selected.min.toLocaleString()} · Max: {selected.max.toLocaleString()}</small>
          </div>
          <div className="field">
            <label>Categoría</label>
            <input readOnly value={selected.category} />
          </div>
          {selected.dripfeed ? (
            <div className="field full">
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
                  <small className="field full">Se entregan {quantity.toLocaleString()} en cada tanda: {totalUnits.toLocaleString()} en total.</small>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="field full charge-field">
            <label>Cargo estimado</label>
            <div className="charge-value">US${charge.toFixed(4)}</div>
          </div>
        </div>

        <div className="order-actions">
          <button className="btn primary submit-order" disabled={submitting || !ordersEnabled} type="submit">
            {submitting ? "Procesando..." : ordersEnabled ? "Crear pedido" : "Pedidos deshabilitados"}
          </button>
          <button className="btn" onClick={() => { setMessage(""); setError(""); }} type="button">Limpiar aviso</button>
        </div>

        {!ordersEnabled ? <div className="notice">El catálogo es real, pero el servidor mantiene los pedidos bloqueados hasta configurar Supabase y activar SMM_LIVE_ORDERS_ENABLED=true.</div> : null}
        {message ? <div className="toast">{message}</div> : null}
        {error ? <div className="notice">{error}</div> : null}
      </form>
    </div>
  );
}
