import { apiError, fail, json, readJsonObject, requireApiSession, sameOrigin } from "@/lib/api";
import { listMembers } from "@/lib/data";
import { userRpc, uuidParam } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  try {
    const { id } = await params;
    return json({ ok: true, data: await listMembers(session.token, uuidParam(id)) });
  } catch (error) {
    return apiError("v1/members:get", error);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  const body = await readJsonObject(request);
  if (!body) return fail(400, "Cuerpo JSON requerido.");
  try {
    const { id } = await params;
    const row = await userRpc(session.token, "add_organization_member", {
      p_org: uuidParam(id),
      p_email: String(body.email ?? ""),
      p_role: String(body.role ?? ""),
    });
    return json({ ok: true, data: row }, { status: 201 });
  } catch (error) {
    return apiError("v1/members:post", error);
  }
}
