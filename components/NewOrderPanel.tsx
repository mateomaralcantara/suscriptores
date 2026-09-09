"use client";

import { FormEvent, useMemo, useState } from "react";
import { orderPlatforms, orderServices } from "@/lib/order-services";

export function NewOrderPanel() {
  const [platform, setPlatform] = useState("All");
  const [search, setSearch] = useState("");
  const [serviceId, setServiceId] = useState(orderServices[0].id);
  const [quantity, setQuantity] = useState(orderServices[0].min);
  const [link, setLink] = useState("https://example.com/campaign/demo");
  const [message, setMessage] = useState("");

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orderServices.filter((service) => {
      const matchesPlatform = platform === "All" || service.platform === platform;
      const matchesSearch = !term || `${service.id} ${service.name} ${service.description}`.toLowerCase().includes(term);
      return matchesPlatform && matchesSearch;
    });
  }, [platform, search]);

  const selected = orderServices.find((service) => service.id === serviceId) ?? filteredServices[0] ?? orderServices[0];
  const charge = Math.max(0, (quantity / 1000) * selected.rate);

  function selectPlatform(nextPlatform: string) {
    setPlatform(nextPlatform);
    const first = orderServices.find((service) => nextPlatform === "All" || service.platform === nextPlatform);
    if (first) {
      setServiceId(first.id);
      setQuantity(first.min);
    }
  }

  function selectService(nextId: string) {
    const next = orderServices.find((service) => service.id === nextId);
    if (!next) return;
    setServiceId(next.id);
    setQuantity(next.min);
    setMessage("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (quantity < selected.min || quantity > selected.max) {
      setMessage(`La cantidad debe estar entre ${selected.min.toLocaleString()} y ${selected.max.toLocaleString()}.`);
      return;
    }
    setMessage(`Pedido sandbox creado: ${selected.id} · US$${charge.toFixed(4)}. No se envió a un proveedor real.`);
  }

  return (
    <div className="order-workspace">
      <section className="affiliate-strip">
        <strong>Affiliate commission rate is now 5%!</strong>
        <span>Referral</span>
      </section>

      <section className="platform-tabs" aria-label="Filtrar por plataforma">
        {orderPlatforms.map((item) => (
          <button
            className={platform === item ? "platform-tab active" : "platform-tab"}
            key={item}
            onClick={() => selectPlatform(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </section>

      <form className="card order-card" onSubmit={submit}>
        <div className="order-search-row">
          <div className="field">
            <label htmlFor="service-search">Search</label>
            <input
              id="service-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ID, platform or service"
              value={search}
            />
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" onChange={(event) => selectPlatform(event.target.value)} value={platform}>
              {orderPlatforms.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>

        <div className="field full">
          <label htmlFor="service">Service</label>
          <select id="service" onChange={(event) => selectService(event.target.value)} value={selected.id}>
            {filteredServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.icon} {service.id} - {service.name} [{service.quality}] [{service.speed}] {service.refillDays ? `[Refill: ${service.refillDays} Days]` : "[No Refill]"} - ${service.rate.toFixed(3)} per 1000{service.isNew ? " · NEW" : ""}
              </option>
            ))}
          </select>
          <small className="result-count">{filteredServices.length} services shown · API-ready data model</small>
        </div>

        <div className="service-summary">
          <div><span>ID</span><strong>{selected.id}</strong></div>
          <div><span>Platform</span><strong>{selected.platform}</strong></div>
          <div><span>Rate</span><strong>${selected.rate.toFixed(3)} / 1000</strong></div>
          <div><span>Average time</span><strong>{selected.averageTime}</strong></div>
        </div>

        <div className="field full">
          <label>Description</label>
          <div className="service-description">{selected.description}</div>
        </div>

        <div className="form-grid">
          <div className="field full">
            <label htmlFor="link">Link</label>
            <input id="link" onChange={(event) => setLink(event.target.value)} required type="url" value={link} />
          </div>
          <div className="field">
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              max={selected.max}
              min={selected.min}
              onChange={(event) => setQuantity(Number(event.target.value))}
              required
              type="number"
              value={quantity}
            />
            <small>Min: {selected.min.toLocaleString()} - Max: {selected.max.toLocaleString()}</small>
          </div>
          <div className="field">
            <label>Average time</label>
            <input readOnly value={selected.averageTime} />
          </div>
          <div className="field full charge-field">
            <label>Charge</label>
            <div className="charge-value">US${charge.toFixed(4)}</div>
          </div>
        </div>

        <div className="order-actions">
          <button className="btn primary submit-order" type="submit">Submit sandbox order</button>
          <button className="btn" onClick={() => setMessage("")} type="button">Clear notice</button>
        </div>

        {message ? <div className="toast">{message}</div> : null}
        <p className="sandbox-note">CLASSROOM / SANDBOX: this interface is ready to consume an approved provider API, but no real provider is enabled.</p>
      </form>

      <footer className="panel-footer">
        <span>Growth Reseller Lab © Copyright. All Rights Reserved.</span>
        <span>Terms &amp; Policy · FAQ · We Accept: VISA / MasterCard (sandbox)</span>
      </footer>
    </div>
  );
}
