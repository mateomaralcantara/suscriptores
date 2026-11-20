"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { send } from "@/lib/client-api";

type Option = { id: string; name: string };

export function OrgSwitcher({ options, activeId }: { options: Option[]; activeId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (options.length === 0) return null;
  return (
    <label className="small" style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
      <span className="muted">Organización</span>
      <select
        value={activeId ?? ""}
        disabled={busy}
        onChange={async (e) => {
          if (e.target.value === "__new") return router.push("/organizacion/nueva");
          setBusy(true);
          await send("POST", "/api/session/organization", { organizationId: e.target.value });
          setBusy(false);
          router.refresh();
        }}
        style={{ width: "auto", maxWidth: 240 }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
        <option value="__new">+ Nueva organización…</option>
      </select>
    </label>
  );
}
