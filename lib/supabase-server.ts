import { cookies } from "next/headers";

export const ACCESS_COOKIE = "gr_access_token";
export const REFRESH_COOKIE = "gr_refresh_token";

export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type AuthSession = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user: SupabaseUser;
};

export type ProfileRow = {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  currency: string;
};

export type WalletRow = {
  id: string;
  user_id: string;
  currency: string;
  available_minor: number;
  reserved_minor: number;
  promotional_minor: number;
};

export type OrderRow = {
  id: string;
  public_id: string;
  user_id: string;
  external_service_id?: string | null;
  provider_order_id?: string | null;
  target: string;
  quantity: number;
  cost_minor: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type TransactionRow = {
  id: string;
  reference: string;
  type: string;
  status: string;
  currency: string;
  amount_minor: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function config() {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  return { url: url.replace(/\/$/, ""), anonKey, serviceRoleKey };
}

async function parseResponse(response: Response) {
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : payload && typeof payload === "object" && "error_description" in payload
          ? String((payload as { error_description?: unknown }).error_description)
          : `Supabase HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export async function signInWithPassword(email: string, password: string) {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  return (await parseResponse(response)) as AuthSession;
}

export async function signUp(email: string, password: string, fullName: string) {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
    cache: "no-store",
  });
  return (await parseResponse(response)) as AuthSession;
}

export async function sendPasswordRecovery(email: string) {
  const { url, anonKey } = config();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3004";
  const response = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(`${appUrl}/login`)}`, {
    method: "POST",
    headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });
  await parseResponse(response);
}

export async function getSupabaseUser(accessToken: string) {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return (await parseResponse(response)) as SupabaseUser;
}

function tokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ACCESS_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function getUserFromRequest(request: Request) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  try {
    return await getSupabaseUser(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    return await getSupabaseUser(token);
  } catch {
    return null;
  }
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_ANON_KEY?.trim());
}

export async function serviceRoleRest<T>(path: string, init: RequestInit = {}) {
  const { url, serviceRoleKey } = config();
  if (!serviceRoleKey || serviceRoleKey.startsWith("http")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing or invalid.");
  }
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  return (await parseResponse(response)) as T;
}

export async function supabaseRpc<T>(name: string, args: Record<string, unknown>) {
  return serviceRoleRest<T>(`rpc/${name}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(args),
  });
}

export async function getProfileForAuthUser(authUserId: string) {
  const rows = await serviceRoleRest<ProfileRow[]>(
    `profiles?auth_user_id=eq.${encodeURIComponent(authUserId)}&select=*&limit=1`,
  );
  return rows[0] ?? null;
}

export async function ensureProfileForUser(user: SupabaseUser) {
  const existing = await getProfileForAuthUser(user.id);
  if (existing) return existing;
  const tenants = await serviceRoleRest<Array<{ id: string }>>(
    "tenants?slug=eq.main&select=id&limit=1",
  );
  if (!tenants[0]) throw new Error("Main tenant is missing. Run database migration 002_live_core.sql.");
  const fullName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : user.email?.split("@")[0] || "Usuario";
  const created = await serviceRoleRest<ProfileRow[]>("profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      tenant_id: tenants[0].id,
      auth_user_id: user.id,
      email: user.email ?? `${user.id}@unknown.local`,
      full_name: fullName,
      role: isAdminEmail(user.email) ? "admin" : "client",
    }),
  });
  return created[0];
}

export async function getWalletForProfile(profileId: string) {
  const rows = await serviceRoleRest<WalletRow[]>(
    `wallets?user_id=eq.${encodeURIComponent(profileId)}&currency=eq.USD&select=*&limit=1`,
  );
  return rows[0] ?? null;
}

export async function listOrdersForProfile(profileId: string) {
  return serviceRoleRest<OrderRow[]>(
    `orders?user_id=eq.${encodeURIComponent(profileId)}&select=*&order=created_at.desc&limit=200`,
  );
}

export async function getOrderForProfile(profileId: string, idOrPublicId: string) {
  const byPublic = await serviceRoleRest<OrderRow[]>(
    `orders?user_id=eq.${encodeURIComponent(profileId)}&public_id=eq.${encodeURIComponent(idOrPublicId)}&select=*&limit=1`,
  );
  if (byPublic[0]) return byPublic[0];
  if (!/^[0-9a-f-]{36}$/i.test(idOrPublicId)) return null;
  const byId = await serviceRoleRest<OrderRow[]>(
    `orders?user_id=eq.${encodeURIComponent(profileId)}&id=eq.${encodeURIComponent(idOrPublicId)}&select=*&limit=1`,
  );
  return byId[0] ?? null;
}

export async function listTransactionsForProfile(profileId: string) {
  return serviceRoleRest<TransactionRow[]>(
    `transactions?user_id=eq.${encodeURIComponent(profileId)}&select=*&order=created_at.desc&limit=200`,
  );
}
