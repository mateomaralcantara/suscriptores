"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isTerminalStatus, STATUS_LABELS } from "@/lib/order-status";

type Progress = { delivered: number; remains: number; percent: number; startCount: number | null; currentCount: number | null; checkedAt: string | null };

const REFRESH_SECONDS = 30;

/** Live delivery progress: polls the order (which also syncs status/refunds with the provider) until it finishes. */
export function OrderProgress({ orderId, quantity, initialStatus }: { orderId: string; quantity: number; initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(REFRESH_SECONDS);
  const lastStatus = useRef(initialStatus);
  const finished = isTerminalStatus(status);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
      const result = (await response.json()) as { success?: boolean; error?: string; data?: { status: string }; progress?: Progress };
      if (!response.ok || !result.success || !result.data) throw new Error(result.error || "No fue posible actualizar el pedido.");
      setProgress(result.progress ?? null);
      setStatus(result.data.status);
      setError("");
      if (result.data.status !== lastStatus.current) {
        lastStatus.current = result.data.status;
        router.refresh(); // update the rest of the page (state badge, actions, refunds)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar el pedido.");
    } finally {
      setLoading(false);
      setCountdown(REFRESH_SECONDS);
    }
  }, [orderId, router]);

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(first);
  }, [refresh]);

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          void refresh();
          return REFRESH_SECONDS;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finished, refresh]);

  const percent = progress?.percent ?? 0;

  return (
    <div className="order-progress">
      <div className="progress-head">
        <strong>{STATUS_LABELS[status] ?? status}</strong>
        <span className="muted">{percent.toLocaleString("es-DO")}%</span>
      </div>
      <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className={`progress-fill${finished ? " done" : ""}`} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <div className="list" style={{ marginTop: 14 }}>
        <div className="list-item"><span>Entregadas</span><strong>{(progress?.delivered ?? 0).toLocaleString("es-DO")} de {quantity.toLocaleString("es-DO")}</strong></div>
        <div className="list-item"><span>Faltan</span><strong>{(progress?.remains ?? quantity).toLocaleString("es-DO")}</strong></div>
        <div className="list-item"><span>Contador al iniciar</span><strong>{progress?.startCount === null || progress?.startCount === undefined ? "Aún no disponible" : progress.startCount.toLocaleString("es-DO")}</strong></div>
        <div className="list-item"><span>Contador estimado ahora</span><strong>{progress?.currentCount === null || progress?.currentCount === undefined ? "—" : progress.currentCount.toLocaleString("es-DO")}</strong></div>
      </div>
      <div className="progress-foot">
        <small className="muted">
          {finished
            ? "Pedido finalizado."
            : loading
              ? "Consultando al proveedor…"
              : `Próxima actualización en ${countdown} s${progress?.checkedAt ? ` · última: ${new Date(progress.checkedAt).toLocaleTimeString("es-DO")}` : ""}`}
        </small>
        {!finished ? <button className="btn small" disabled={loading} onClick={() => void refresh()} type="button">Actualizar ahora</button> : null}
      </div>
      {error ? <div className="notice" style={{ marginTop: 10 }}>{error}</div> : null}
    </div>
  );
}
