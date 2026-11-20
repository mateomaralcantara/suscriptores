import { apiError, fail, json, readJsonObject, requireApiSession, sameOrigin } from "@/lib/api";
import { userRpc, uuidParam } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  const body = await readJsonObject(request);
  if (!body) return fail(400, "Cuerpo JSON requerido.");
  try {
    const { id, userId } = await params;
    const row = await userRpc(session.token, "update_member_role", {
      p_org: uuidParam(id),
      p_user: uuidParam(userId),
      p_role: String(body.role ?? ""),
    });
    return json({ ok: true, data: row });
  } catch (error) {
    return apiError("v1/members:patch", error);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  try {
    const { id, userId } = await params;
    await userRpc(session.token, "remove_organization_member", { p_org: uuidParam(id), p_user: uuidParam(userId) });
    return json({ ok: true });
  } catch (error) {
    return apiError("v1/members:delete", error);
  }
}
