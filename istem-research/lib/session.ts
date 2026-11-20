import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, ORG_COOKIE } from "./auth-cookies";
import { getUser, isSupabaseConfigured, type AuthUser } from "./supabase";
import { listMemberships, type Membership } from "./data";

export type PortalSession = {
  token: string;
  user: AuthUser;
  memberships: Membership[];
  active: Membership | null;
};

export const getSession = cache(async (): Promise<{ token: string; user: AuthUser } | null> => {
  if (!isSupabaseConfigured()) return null;
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    return { token, user: await getUser(token) };
  } catch {
    return null;
  }
});

/** Sesión del portal con la organización activa (cookie validada contra las membresías reales). */
export const requirePortalSession = cache(async (): Promise<PortalSession> => {
  const session = await getSession();
  if (!session) redirect("/login");
  const memberships = await listMemberships(session.token, session.user.id);
  const store = await cookies();
  const wanted = store.get(ORG_COOKIE)?.value;
  const active = memberships.find((m) => m.organization.id === wanted) ?? memberships[0] ?? null;
  return { ...session, memberships, active };
});

/** Igual que requirePortalSession, pero exige una organización activa. */
export async function requireOrganization() {
  const session = await requirePortalSession();
  if (!session.active) redirect("/organizacion/nueva");
  return session as PortalSession & { active: Membership };
}
