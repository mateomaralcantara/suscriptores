import { ACCESS_COOKIE } from "./auth-cookies";
import { SupabaseError, getUser, type AuthUser } from "./supabase";

export const apiHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, { ...init, headers: { ...apiHeaders, ...(init.headers ?? {}) } });
}

export function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return json({ ok: false, error, ...extra }, { status });
}

/** Lee un cuerpo JSON que sea objeto; null si falta, está mal formado o no es objeto. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Traduce un error a respuesta HTTP. Solo los mensajes propios (SQLSTATE PTxxx) llegan al cliente;
 * cualquier otro se registra en el servidor y se responde de forma genérica.
 */
export function apiError(scope: string, error: unknown) {
  if (error instanceof SupabaseError && error.userFacing) {
    const status = error.status >= 400 && error.status < 500 ? error.status : 400;
    return fail(status, error.message);
  }
  if (error instanceof SupabaseError && error.code === "not_configured") {
    return fail(503, "El servicio de datos no está configurado.");
  }
  console.error(`[${scope}]`, error);
  return fail(500, "Error interno. Inténtalo de nuevo.");
}

function tokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim() || null;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ACCESS_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export type ApiSession = { token: string; user: AuthUser };

/** Sesión de una petición API (cookie o cabecera Bearer). Devuelve una respuesta 401 si no hay. */
export async function requireApiSession(request: Request): Promise<ApiSession | { error: Response }> {
  const token = tokenFromRequest(request);
  if (!token) return { error: fail(401, "Sesión requerida.") };
  try {
    return { token, user: await getUser(token) };
  } catch (error) {
    if (error instanceof SupabaseError && error.code === "not_configured") return { error: fail(503, "El servicio de datos no está configurado.") };
    return { error: fail(401, "Sesión no válida o vencida.") };
  }
}

/** Rechaza peticiones que cambian estado desde otro origen (defensa CSRF además de SameSite=Lax). */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // clientes API (curl, servidores) no envían Origin
  try {
    return new URL(origin).host === new URL(request.url).host || origin === process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  } catch {
    return false;
  }
}
