import { apiError, json, requireApiSession } from "@/lib/api";
import { listAudit, verifyAudit } from "@/lib/data";
import { uuidParam } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

/** Registro de auditoría. `?verify=1` recalcula la cadena SHA-256 completa. */
export async function GET(request: Request, { params }: Ctx) {
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  try {
    const { id } = await params;
    const orgId = uuidParam(id);
    const url = new URL(request.url);
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));
    const [entries, integrity] = await Promise.all([
      listAudit(session.token, orgId, { limit }),
      url.searchParams.get("verify") === "1" ? verifyAudit(session.token, orgId) : Promise.resolve(null),
    ]);
    return json({ ok: true, data: entries, integrity });
  } catch (error) {
    return apiError("v1/audit:get", error);
  }
}
