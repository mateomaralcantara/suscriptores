import { NextResponse } from "next/server";
import { ORG_COOKIE, cookieOptions } from "@/lib/auth-cookies";
import { apiError, fail, readJsonObject, requireApiSession, sameOrigin } from "@/lib/api";
import { listMemberships } from "@/lib/data";

/** Cambia la organización activa (solo si la persona es miembro activo). */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail(403, "Origen no permitido.");
  const session = await requireApiSession(request);
  if ("error" in session) return session.error;
  const body = (await readJsonObject(request)) ?? {};
  const orgId = String(body.organizationId ?? "");
  try {
    const memberships = await listMemberships(session.token, session.user.id);
    if (!memberships.some((m) => m.organization.id === orgId)) return fail(404, "Organización no encontrada.");
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ORG_COOKIE, orgId, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 180 });
    return response;
  } catch (error) {
    return apiError("session/organization", error);
  }
}
