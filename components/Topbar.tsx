import { ThemeToggle } from "@/components/ThemeToggle";

export function Topbar() {
  return (
    <header className="topbar">
      <div className="search"><span>⌕</span><input aria-label="Buscar" placeholder="Buscar pedidos, servicios, usuarios..." /></div>
      <div className="top-actions"><ThemeToggle /><button className="btn small" type="button">🔔 3</button><div className="avatar">MM</div></div>
    </header>
  );
}
