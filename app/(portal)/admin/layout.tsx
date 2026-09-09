import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdminEmail } from "@/lib/supabase-server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/dashboard");
  return children;
}
