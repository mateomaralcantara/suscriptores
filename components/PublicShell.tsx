import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/Brand";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="main-wrap">
      <header className="topbar"><Brand /><div className="top-actions"><Link className="btn small" href="/login">Iniciar sesión</Link></div></header>
      <main className="content">{children}</main>
    </div>
  );
}
