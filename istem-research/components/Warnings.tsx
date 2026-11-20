import type { Warning } from "@/lib/methodology";

const TITLES: Record<Warning["level"], string> = { bloqueo: "Bloqueo", advertencia: "Advertencia metodológica", info: "Nota" };

export function Warnings({ items }: { items: Warning[] }) {
  if (items.length === 0) return null;
  return (
    <div role="status">
      {items.map((w) => (
        <div key={w.code} className={`alert ${w.level}`}>
          <strong>{TITLES[w.level]}</strong>
          {w.message}
        </div>
      ))}
    </div>
  );
}
