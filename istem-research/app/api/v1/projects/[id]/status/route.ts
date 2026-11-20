import { apiError, fail, json, readJsonObject, requireApiSession, sameOrigin } from "@/lib/api";
import { PROJECT_STATUSES } from "@/lib/project-rules";
import { userRpc, uuidParam } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  const body = await readJsonObject(request);
  const status = String(body?.status ?? "");
  if (!(PROJECT_STATUSES as readonly string[]).includes(status)) return fail(400, "Estado no válido.");
  try {
    const { id } = await params;
    const project = await userRpc(session.token, "change_project_status", {
      p_project: uuidParam(id),
      p_status: status,
      p_reason: String(body?.reason ?? "").slice(0, 500),
    });
    return json({ ok: true, data: project });
  } catch (error) {
    return apiError("v1/project-status:post", error);
  }
}
