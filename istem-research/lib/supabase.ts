// Cliente mínimo de Supabase (Auth + PostgREST) sin SDK.
// Las consultas de datos usan SIEMPRE el token del usuario: la RLS de PostgreSQL decide qué puede
// ver y las funciones RPC deciden qué puede cambiar. La service role no se usa en peticiones de usuarios.

export type AuthUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

export type AuthSession = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: AuthUser;
};

/** Error de Supabase. `userFacing` indica que el mensaje es nuestro (SQLSTATE PTxxx) y puede mostrarse. */
export class SupabaseError extends Error {
  constructor(message: string, readonly status: number, readonly code: string | null, readonly userFacing: boolean) {
    super(message);
    this.name = "SupabaseError";
  }
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_ANON_KEY?.trim());
}

function config() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new SupabaseError("Supabase no está configurado.", 503, "not_configured", false);
  return { url, anonKey };
}

async function parse(response: Response) {
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (response.ok) return payload;
  const body = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const code = typeof body.code === "string" ? body.code : null;
  const message = String(body.message ?? body.error_description ?? body.msg ?? `Supabase HTTP ${response.status}`);
  if (code?.startsWith("PT")) throw new SupabaseError(message, response.status, code, true);
  if (code === "42501") throw new SupabaseError("No tienes permiso para esta acción.", 403, code, true);
  throw new SupabaseError(message, response.status, code, false);
}

async function authPost(path: string, body: Record<string, unknown>) {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  return parse(response);
}

export async function signInWithPassword(email: string, password: string) {
  return (await authPost("token?grant_type=password", { email, password })) as AuthSession;
}

export async function signUp(email: string, password: string, fullName: string) {
  return (await authPost("signup", { email, password, data: { full_name: fullName } })) as AuthSession;
}

export async function sendPasswordRecovery(email: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3010";
  await authPost(`recover?redirect_to=${encodeURIComponent(`${appUrl}/login`)}`, { email });
}

export async function getUser(accessToken: string) {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  return (await parse(response)) as AuthUser;
}

/** Consulta PostgREST con el token del usuario (RLS aplicada). */
export async function userRest<T>(accessToken: string, path: string, init: RequestInit = {}) {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  return (await parse(response)) as T;
}

/** Llama una función RPC con el token del usuario. */
export async function userRpc<T>(accessToken: string, name: string, args: Record<string, unknown>) {
  return userRest<T>(accessToken, `rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}

/** Cuenta filas visibles para el usuario sin transferirlas (cabecera Content-Range). */
export async function userCount(accessToken: string, table: string, filter = "") {
  const { url, anonKey } = config();
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1${filter ? `&${filter}` : ""}`, {
    method: "HEAD",
    headers: { apikey: anonKey, authorization: `Bearer ${accessToken}`, Prefer: "count=exact" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new SupabaseError(`Supabase HTTP ${response.status}`, response.status, null, false);
  const total = Number(response.headers.get("content-range")?.split("/")[1]);
  return Number.isFinite(total) ? total : 0;
}

/** Filtro PostgREST seguro para un UUID (evita inyección en la URL). */
export function uuidParam(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new SupabaseError("Identificador no válido.", 400, "invalid_uuid", true);
  }
  return value.toLowerCase();
}
