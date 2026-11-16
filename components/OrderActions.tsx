"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderActions({ orderId, canCancel, canRefill }: { orderId: string; canCancel: boolean; canRefill: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"cancel" | "refill" | null>(null);
  const [message, setMessage] = useState("");

  async function action(kind: "cancel" | "refill") {
    setLoading(kind);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}/${kind}`, { method: "POST" });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "La solicitud no pudo completarse.");
      setMessage(kind === "cancel" ? "Cancelación solicitada." : "Refill solicitado.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "La solicitud no pudo completarse.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="form-actions">
        {canCancel ? <button className="btn danger" disabled={loading !== null} onClick={() => action("cancel")} type="button">{loading === "cancel" ? "Solicitando..." : "Solicitar cancelación"}</button> : null}
        {canRefill ? <button className="btn" disabled={loading !== null} onClick={() => action("refill")} type="button">{loading === "refill" ? "Solicitando..." : "Solicitar refill"}</button> : null}
      </div>
      {message ? <div className="notice" style={{ marginTop: 12 }}>{message}</div> : null}
    </div>
  );
}
