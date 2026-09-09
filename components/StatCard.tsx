export function StatCard({ label, value, note, icon }: { label: string; value: string; note?: string; icon?: string }) {
  return (
    <article className="card kpi">
      <div className="kpi-top"><span>{label}</span><span>{icon ?? "•"}</span></div>
      <strong>{value}</strong>
      {note ? <span className="delta">{note}</span> : null}
    </article>
  );
}
