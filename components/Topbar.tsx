import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";

export function Topbar() {
  return (
    <header className="topbar">
      <div className="search"><span>⌕</span><input aria-label="Buscar" placeholder="Buscar pedidos, servicios..." /></div>
      <div className="top-actions"><ThemeToggle /><AccountMenu /></div>
    </header>
  );
}
