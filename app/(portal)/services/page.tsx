import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";
import { StatusBadge } from "@/components/StatusBadge";
import { services, categories } from "@/lib/demo-data";
import { money } from "@/lib/format";

export default function ServicesPage() {
  return <>
    <PageHeader title="Catálogo de servicios" description="100 servicios legales y simulados con proveedores, garantías y precios configurables." action={<Link className="btn primary" href="/orders/new">Crear pedido</Link>} />
    <div className="grid four" style={{ marginBottom: 18 }}>{categories.slice(0, 4).map((category, index) => <article className="card" key={category}><span className="muted">Categoría</span><h3>{category}</h3><strong>{8 + index * 3} servicios</strong></article>)}</div>
    <div className="card" style={{ marginBottom: 18 }}><div className="form-grid"><div className="field"><label>Buscar</label><input placeholder="Nombre, ID o categoría" /></div><div className="field"><label>Categoría</label><select><option>Todas</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></div></div></div>
    <SimpleTable headers={["ID", "Servicio", "Categoría", "Precio", "Rango", "Calidad", "Estado"]} rows={services.slice(0, 24).map((service) => [service.id, <div key={service.id}><strong>{service.name}</strong><div className="muted">{service.eta} · {service.refill ? "Refill" : "Sin refill"}</div></div>, service.category, money(service.userPrice), `${service.min}-${service.max}`, service.quality, <StatusBadge status={service.status} key={service.id} />])} />
  </>;
}
