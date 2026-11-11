import type { ReactNode } from "react";
import { DemoBanner } from "@/components/DemoBanner";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { isDemoMode } from "@/lib/config";
import type { PublicUser } from "@/lib/store";

export function AppShell({ children, user }: { children: ReactNode; user: PublicUser }) {
  return (
    <div className="app-layout">
      <Sidebar isAdmin={user.role === "admin"} />
      <div className="main-wrap">
        <Topbar user={user} />
        <main className="content">{isDemoMode() ? <DemoBanner /> : null}{children}</main>
      </div>
    </div>
  );
}
