import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { PublicShell } from "@/components/PublicShell";
import { currentUser } from "@/lib/server/current-user";

/**
 * Private pages are guarded by the proxy; the public legal/help pages share this
 * layout and are shown without the application chrome when nobody is signed in.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  return user ? <AppShell user={user}>{children}</AppShell> : <PublicShell>{children}</PublicShell>;
}
