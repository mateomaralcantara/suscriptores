"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/client/request";

export function OrderActions({ orderId, canCancel, canRefill }: { orderId: string; canCancel: boolean; canRefill: boolean }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: "cancel" | "refill", success: string) {
    setBusy(true);
    const result = await apiRequest(`/api/v1/orders/${encodeURIComponent(orderId)}/${action}`, { method: "POST" });
    setNotice(result.ok ? { text: success, error: false } : { text: result.message, error: true });
    setBusy(false);
    if (result.ok) router.refresh();
  }

  return <>
    <div className="form-actions">
      <button className="btn danger" disabled={busy || !canCancel} onClick={() => run("cancel", "Pedido cancelado y reembolsado.")} type="button">Cancelar pedido</button>
      <button className="btn" disabled={busy || !canRefill} onClick={() => run("refill", "Refill solicitado.")} type="button">Solicitar refill</button>
    </div>
    {notice ? <div className={notice.error ? "toast error" : "toast"} role="status">{notice.text}</div> : null}
  </>;
}
