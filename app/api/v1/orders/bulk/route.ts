import { NextResponse } from "next/server";
import { internalError, readJsonObject } from "@/lib/api";
import { BULK_MAX_ROWS, parseBulkOrders } from "@/lib/bulk-orders";
import { createLiveOrder } from "@/lib/create-order";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { ensureProfileForUser, getUserFromRequest } from "@/lib/supabase-server";

/**
 * Mass orders. Each row goes through the same atomic reservation as a single order, with its own
 * idempotency key (batchKey:line), so retrying the same batch never charges a row twice.
 */
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  const limited = rateLimit(`bulk:${user.id}`, 10, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds);

  const body = await readJsonObject(request);
  const batchKey = String(body?.batchKey ?? "").trim().slice(0, 100);
  if (!body || typeof body.text !== "string" || !batchKey) {
    return NextResponse.json({ success: false, error: "Se esperaba { text, batchKey }." }, { status: 400 });
  }
  const { rows, errors } = parseBulkOrders(body.text);
  if (errors.length > 0 || rows.length === 0) {
    return NextResponse.json(
      { success: false, error: rows.length === 0 && errors.length === 0 ? "No hay pedidos en el texto." : "Hay líneas con errores; no se creó ningún pedido.", errors },
      { status: 400 },
    );
  }
  if (rows.length > BULK_MAX_ROWS) return NextResponse.json({ success: false, error: `Máximo ${BULK_MAX_ROWS} pedidos por lote.` }, { status: 413 });

  try {
    const profile = await ensureProfileForUser(user);
    const results = [];
    for (const row of rows) {
      const result = await createLiveOrder(user.id, profile, {
        serviceId: row.serviceId, link: row.link, quantity: row.quantity, idempotencyKey: `bulk:${batchKey}:${row.line}`,
      });
      results.push(result.ok
        ? { line: row.line, ok: true, order: result.order.publicId, cost: result.order.cost }
        : { line: row.line, ok: false, error: result.error, ...(result.orderId ? { order: result.orderId } : {}) });
      // Stop early when the balance runs out instead of failing every remaining row.
      if (!result.ok && result.status === 402) break;
    }
    const created = results.filter((item) => item.ok).length;
    return NextResponse.json({ success: created > 0, created, total: rows.length, results }, { status: created > 0 ? 207 : 422 });
  } catch (error) {
    return internalError("orders/bulk", error);
  }
}
