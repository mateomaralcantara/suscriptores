import { apiError, fail, json, readJsonObject, requireApiSession, sameOrigin } from "@/lib/api";
import { getProject, listProjectMembers } from "@/lib/data";
import { validateProject } from "@/lib/project-rules";
import { userRpc, uuidParam } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

const EDITABLE = [
  "title", "research_question", "objective_type", "description", "target_population", "geo_area_codes", "methods",
  "sampling_design", "planned_sample_size", "target_moe", "confidence_level", "starts_on", "ends_on",
] as const;

export async function GET(request: Request, { params }: Ctx) {
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  try {
    const { id } = await params;
    const project = await getProject(session.token, uuidParam(id));
    if (!project) return fail(404, "Proyecto no encontrado.");
    return json({ ok: true, data: { ...project, members: await listProjectMembers(session.token, project.id) } });
  } catch (error) {
    return apiError("v1/project:get", error);
  }
}

/** Edición parcial con control de concurrencia: envía `version` (la que leíste) y los campos a cambiar. */
export async function PATCH(request: Request, { params }: Ctx) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  const body = await readJsonObject(request);
  if (!body) return fail(400, "Cuerpo JSON requerido.");
  const version = Number(body.version);
  if (!Number.isInteger(version) || version < 1) return fail(400, "Indica la versión que estás editando.");
  try {
    const { id } = await params;
    const current = await getProject(session.token, uuidParam(id));
    if (!current) return fail(404, "Proyecto no encontrado.");
    const changes = Object.fromEntries(EDITABLE.filter((k) => k in body).map((k) => [k, body[k]]));
    if (Object.keys(changes).length === 0) return fail(400, "No hay cambios.");
    const merged = validateProject({ ...current, ...changes });
    if (!merged.ok) return fail(400, "Revisa los datos del proyecto.", { fields: merged.errors });
    const clean = Object.fromEntries(Object.keys(changes).map((k) => [k, merged.value[k as keyof typeof merged.value]]));
    const project = await userRpc(session.token, "update_project", { p_project: current.id, p_expected_version: version, p_data: clean });
    return json({ ok: true, data: project });
  } catch (error) {
    return apiError("v1/project:patch", error);
  }
}
