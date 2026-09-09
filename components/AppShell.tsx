import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { DemoBanner } from "@/components/DemoBanner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrap">
        <Topbar />
        <main className="content"><DemoBanner />{children}</main>
      </div>
    </div>
  );
}
