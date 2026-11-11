import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { PublicUser } from "@/lib/store";

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Topbar({ user }: { user: PublicUser }) {
  return (
    <header className="topbar">
      <div className="search"><span>⌕</span><input aria-label="Buscar" placeholder="Buscar pedidos, servicios, usuarios..." /></div>
      <div className="top-actions"><ThemeToggle /><span className="muted">{user.email}</span><div className="avatar" title={user.name}>{initials(user.name)}</div><LogoutButton /></div>
    </header>
  );
}
