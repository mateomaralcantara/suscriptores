// Acceso a datos con el token del usuario (RLS aplicada en cada consulta).
import { userCount, userRest, userRpc, uuidParam } from "./supabase";
import type { ProjectStatus } from "./project-rules";

export type Organization = { id: string; name: string; slug: string; country_code: string; status: string; created_at: string };
export type Membership = { role_code: string; status: string; organization: Organization; permissions: string[] };
export type Role = { code: string; name: string; description: string; scope: string; sort_order: number };

export type Project = {
  id: string;
  organization_id: string;
  code: string;
  title: string;
  research_question: string;
  objective_type: string;
  description: string;
  target_population: string;
  country_code: string;
  geo_area_codes: string[];
  methods: string[];
  sampling_design: string;
  planned_sample_size: number | null;
  target_moe: number | string | null;
  confidence_level: number | string | null;
  status: ProjectStatus;
  starts_on: string | null;
  ends_on: string | null;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Member = {
  organization_id: string;
  user_id: string;
  role_code: string;
  status: string;
  created_at: string;
  profile: { email: string; full_name: string } | null;
};

export type ProjectMember = { project_id: string; user_id: string; role: string; created_at: string };

export type AuditEntry = {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  hash: string;
  created_at: string;
};

export type GeoArea = { code: string; name: string; level: string; parent_code: string | null; official_code: string | null; verified_at: string | null };

export async function listMemberships(token: string, userId: string): Promise<Membership[]> {
  const rows = await userRest<Array<Omit<Membership, "permissions"> & { organization: Organization | null }>>(
    token,
    `organization_members?user_id=eq.${uuidParam(userId)}&status=eq.activo&select=role_code,status,organization:organizations(id,name,slug,country_code,status,created_at)`,
  );
  const valid = rows.filter((r): r is Omit<Membership, "permissions"> => Boolean(r.organization) && r.organization?.status === "activa");
  if (valid.length === 0) return [];
  const roles = [...new Set(valid.map((r) => r.role_code))];
  const grants = await userRest<Array<{ role_code: string; permission_code: string }>>(
    token,
    `role_permissions?role_code=in.(${roles.map(encodeURIComponent).join(",")})&select=role_code,permission_code`,
  );
  return valid
    .map((r) => ({ ...r, permissions: grants.filter((g) => g.role_code === r.role_code).map((g) => g.permission_code) }))
    .sort((a, b) => a.organization.name.localeCompare(b.organization.name, "es"));
}

export function listRoles(token: string) {
  return userRest<Role[]>(token, "roles?scope=eq.organizacion&select=*&order=sort_order");
}

export function listProjects(token: string, orgId: string, options: { status?: string; limit?: number } = {}) {
  const status = options.status ? `&status=eq.${encodeURIComponent(options.status)}` : "";
  return userRest<Project[]>(
    token,
    `projects?organization_id=eq.${uuidParam(orgId)}${status}&select=*&order=updated_at.desc&limit=${options.limit ?? 200}`,
  );
}

export async function getProject(token: string, projectId: string) {
  const rows = await userRest<Project[]>(token, `projects?id=eq.${uuidParam(projectId)}&select=*&limit=1`);
  return rows[0] ?? null;
}

export function listProjectMembers(token: string, projectId: string) {
  return userRest<ProjectMember[]>(token, `project_members?project_id=eq.${uuidParam(projectId)}&select=*&order=created_at`);
}

export async function listMembers(token: string, orgId: string): Promise<Member[]> {
  const members = await userRest<Omit<Member, "profile">[]>(
    token,
    `organization_members?organization_id=eq.${uuidParam(orgId)}&select=organization_id,user_id,role_code,status,created_at&order=created_at`,
  );
  if (members.length === 0) return [];
  const profiles = await userRest<Array<{ id: string; email: string; full_name: string }>>(
    token,
    `users_profiles?id=in.(${members.map((m) => uuidParam(m.user_id)).join(",")})&select=id,email,full_name`,
  );
  return members.map((m) => {
    const profile = profiles.find((p) => p.id === m.user_id);
    return { ...m, profile: profile ? { email: profile.email, full_name: profile.full_name } : null };
  });
}

export function listAudit(token: string, orgId: string, options: { entityId?: string; limit?: number } = {}) {
  const entity = options.entityId ? `&entity_id=eq.${encodeURIComponent(options.entityId)}` : "";
  return userRest<AuditEntry[]>(
    token,
    `audit_logs?organization_id=eq.${uuidParam(orgId)}${entity}&select=id,actor_id,action,entity_type,entity_id,details,hash,created_at&order=id.desc&limit=${options.limit ?? 100}`,
  );
}

export async function verifyAudit(token: string, orgId: string) {
  const rows = await userRpc<Array<{ ok: boolean; checked: number; broken_at: number | null }>>(token, "verify_audit_chain", { p_org: uuidParam(orgId) });
  return rows[0] ?? { ok: true, checked: 0, broken_at: null };
}

export function listGeoAreas(token: string, country = "DO") {
  return userRest<GeoArea[]>(token, `geo_areas?country_code=eq.${encodeURIComponent(country)}&select=code,name,level,parent_code,official_code,verified_at&order=code`);
}

export async function getSubscription(token: string, orgId: string) {
  const rows = await userRest<Array<{ plan_code: string; status: string; activated_at: string | null; notes: string }>>(
    token,
    `subscriptions?organization_id=eq.${uuidParam(orgId)}&select=plan_code,status,activated_at,notes&limit=1`,
  );
  return rows[0] ?? null;
}

export async function projectCounts(token: string, orgId: string) {
  const org = `organization_id=eq.${uuidParam(orgId)}`;
  const [total, active, finished, archived] = await Promise.all([
    userCount(token, "projects", org),
    userCount(token, "projects", `${org}&status=in.(diseno,campo,analisis,revision)`),
    userCount(token, "projects", `${org}&status=eq.terminado`),
    userCount(token, "projects", `${org}&status=eq.archivado`),
  ]);
  return { total, active, finished, archived };
}
