import { NextResponse } from "next/server";
import { internalError } from "@/lib/api";
import { isCronAuthorized } from "@/lib/cron-auth";
import { syncOpenOrders } from "@/lib/order-sync";

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado." }, { status: 503 });
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await syncOpenOrders()) });
  } catch (error) {
    return internalError("cron/sync-orders", error);
  }
}

export const GET = handle;
export const POST = handle;
