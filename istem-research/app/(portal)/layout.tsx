import type { ReactNode } from "react";
import { Brand } from "@/components/Brand";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileNav, SideNav } from "@/components/Nav";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { requirePortalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await requirePortalSession();
  return (
    <div className="app">
      <aside className="sidebar">
        <Brand href="/inicio" />
        <SideNav />
      </aside>
      <div className="main">
        <header className="topbar">
          <MobileNav />
          <OrgSwitcher
            options={session.memberships.map((m) => ({ id: m.organization.id, name: m.organization.name }))}
            activeId={session.active?.organization.id ?? null}
          />
          <div className="topbar-right">
            <span className="small muted">{session.user.email}</span>
            <LogoutButton />
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
