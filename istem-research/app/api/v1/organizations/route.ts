import { apiError, fail, json, readJsonObject, requireApiSession, sameOrigin } from "@/lib/api";
import { listMemberships } from "@/lib/data";
import { userRpc } from "@/lib/supabase";

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  try {
    return json({ ok: true, data: await listMemberships(session.token, session.user.id) });
  } catch (error) {
    return apiError("v1/organizations:get", error);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  const body = await readJsonObject(request);
  if (!body) return fail(400, "Cuerpo JSON requerido.");
  try {
    const org = await userRpc(session.token, "create_organization", {
      p_name: String(body.name ?? ""),
      p_slug: String(body.slug ?? ""),
      p_country: String(body.countryCode ?? "DO"),
    });
    return json({ ok: true, data: org }, { status: 201 });
  } catch (error) {
    return apiError("v1/organizations:post", error);
  }
}
