import type { ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SimpleTable } from "@/components/SimpleTable";

export function AdminEntityPage({ title, description, headers, rows, stats }: { title: string; description: string; headers: string[]; rows: ReactNode[][]; stats?: Array<[string, string]> }) {
  return <><PageHeader title={title} description={description} action={<button className="btn primary" type="button">＋ Crear registro</button>} />{stats ? <div className="grid four" style={{ marginBottom: 18 }}>{stats.map(([label, value]) => <div className="card" key={label}><span className="muted">{label}</span><h3>{value}</h3></div>)}</div> : null}<SimpleTable headers={headers} rows={rows} /></>;
}
