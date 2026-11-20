import { apiError, fail, json, readJsonObject, requireApiSession, sameOrigin } from "@/lib/api";
import { listProjects } from "@/lib/data";
import { PROJECT_STATUSES, validateProject } from "@/lib/project-rules";
import { userRpc, uuidParam } from "@/lib/supabase";

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  const url = new URL(request.url);
  const org = url.searchParams.get("organization");
  const status = url.searchParams.get("status") ?? undefined;
  if (!org) return fail(400, "Indica ?organization=<id>.");
  if (status && !(PROJECT_STATUSES as readonly string[]).includes(status)) return fail(400, "Estado no válido.");
  try {
    return json({ ok: true, data: await listProjects(session.token, uuidParam(org), { status }) });
  } catch (error) {
    return apiError("v1/projects:get", error);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  const body = await readJsonObject(request);
  if (!body) return fail(400, "Cuerpo JSON requerido.");
  const result = validateProject(body);
  if (!result.ok) return fail(400, "Revisa los datos del proyecto.", { fields: result.errors });
  try {
    const project = await userRpc(session.token, "create_project", {
      p_org: uuidParam(String(body.organizationId ?? "")),
      p_data: result.value,
    });
    return json({ ok: true, data: project }, { status: 201 });
  } catch (error) {
    return apiError("v1/projects:post", error);
  }
}
