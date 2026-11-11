"use client";

import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client/request";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await apiRequest("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return <button className="btn small" onClick={logout} type="button">Salir</button>;
}
