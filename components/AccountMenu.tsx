"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = { email?: string; isAdmin?: boolean };

export function AccountMenu() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active && result?.user) setAccount(result.user as Account);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const email = account?.email ?? "Cuenta";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="top-actions">
      <span className="muted" title={email}>{account?.isAdmin ? "Admin" : email}</span>
      <button className="btn small" type="button" onClick={logout}>Salir</button>
      <div className="avatar" title={email}>{initials}</div>
    </div>
  );
}
