"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";

function NavList() {
  const pathname = usePathname();
  return (
    <ul className="nav">
      {MODULES.map((m) => {
        const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
        return (
          <li key={m.slug}>
            <Link href={m.href} aria-current={active ? "page" : undefined}>
              <span>{m.label}</span>
              {m.status !== "disponible" ? (
                <span className="phase" title={m.status === "parcial" ? "Disponible en parte" : "Planificado"}>
                  {m.status === "parcial" ? "parcial" : `fase ${m.phase}`}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SideNav() {
  return (
    <nav aria-label="Menú principal">
      <NavList />
    </nav>
  );
}

export function MobileNav() {
  return (
    <details className="nav-mobile">
      <summary>Menú</summary>
      <nav aria-label="Menú principal">
        <NavList />
      </nav>
    </details>
  );
}
