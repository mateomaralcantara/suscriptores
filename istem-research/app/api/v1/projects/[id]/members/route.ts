import { apiError, fail, json, readJsonObject, requireApiSession, sameOrigin } from "@/lib/api";
import { userRpc, uuidParam } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  const body = await readJsonObject(request);
  if (!body) return fail(400, "Cuerpo JSON requerido.");
  try {
    const { id } = await params;
    const row = await userRpc(session.token, "set_project_member", {
      p_project: uuidParam(id),
      p_user: uuidParam(String(body.userId ?? "")),
      p_role: String(body.role ?? "colaborador"),
    });
    return json({ ok: true, data: row });
  } catch (error) {
    return apiError("v1/project-members:post", error);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  try {
    const { id } = await params;
    const userId = new URL(request.url).searchParams.get("userId") ?? "";
    await userRpc(session.token, "remove_project_member", { p_project: uuidParam(id), p_user: uuidParam(userId) });
    return json({ ok: true });
  } catch (error) {
    return apiError("v1/project-members:delete", error);
  }
}
