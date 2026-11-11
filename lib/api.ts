import { ApiError, isApiError } from "./errors.ts";
import { readCookie, verifySession, signSession, type Role } from "./auth/session.ts";
import { isDemoMode, isProduction, SESSION_COOKIE, SESSION_TTL_SECONDS, sessionSecret } from "./config.ts";
import { RateLimiter } from "./rate-limit.ts";
import { getStore, toPublicUser, type PublicUser } from "./store.ts";

/** Shared helpers for route handlers: responses, body parsing, auth, CSRF and rate limits. */

function baseHeaders(): Record<string, string> {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-growth-mode": isDemoMode() ? "sandbox" : "live",
  };
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(baseHeaders());
  new Headers(init.headers).forEach((value, key) => (key === "set-cookie" ? headers.append(key, value) : headers.set(key, value)));
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(error: ApiError, headers?: HeadersInit): Response {
  return json(
    { success: false, error: { code: error.code, message: error.message, ...(error.details !== undefined ? { details: error.details } : {}) } },
    { status: error.status, headers },
  );
}

const MAX_BODY_BYTES = 256 * 1024;

/** Parses a JSON body, rejecting oversized or malformed payloads instead of guessing. */
export async function readJson(request: Request, maxBytes: number = MAX_BODY_BYTES): Promise<unknown> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new ApiError(413, "payload_too_large", "El cuerpo de la petición es demasiado grande.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_json", "El cuerpo debe ser JSON válido.");
  }
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/**
 * Cookie-authenticated mutations must come from our own origin.
 * API-key requests are exempt: they carry no ambient credentials.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  if (!originHost || !host || originHost !== host) {
    throw new ApiError(403, "csrf_rejected", "Origen de la petición no permitido.");
  }
}

const apiLimiter = new RateLimiter(120, 60_000);
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Resolves the caller from `Authorization: Bearer <api key>` or the session cookie. */
export async function authenticate(request: Request): Promise<PublicUser> {
  const store = getStore();
  const authorization = request.headers.get("authorization");
  let user: PublicUser | undefined;

  if (authorization) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization);
    const found = match ? store.findUserByApiKey(match[1]) : undefined;
    if (!found) throw new ApiError(401, "invalid_api_key", "La API key no es válida.");
    user = toPublicUser(found);
  } else {
    const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
    const session = await verifySession(token, sessionSecret());
    const found = session ? store.getUser(session.uid) : undefined;
    if (!found) throw new ApiError(401, "unauthenticated", "Inicia sesión o envía una API key.");
    if (MUTATING.has(request.method)) assertSameOrigin(request);
    user = toPublicUser(found);
  }

  const limit = apiLimiter.check(user.id);
  if (!limit.allowed) {
    throw new ApiError(429, "rate_limited", "Demasiadas peticiones. Intenta de nuevo en un momento.", { retryAfterSeconds: limit.retryAfterSeconds });
  }
  return user;
}

export function requireRole(user: PublicUser, role: Role): void {
  if (user.role !== role) throw new ApiError(403, "forbidden", "No tienes permisos para esta operación.");
}

export async function sessionCookie(user: PublicUser): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await signSession({ uid: user.id, role: user.role, exp }, sessionSecret());
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${isProduction() ? "; Secure" : ""}`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction() ? "; Secure" : ""}`;
}

/** Wraps a handler so domain errors become consistent JSON and nothing leaks on a crash. */
export function handle<Args extends unknown[]>(handler: (request: Request, ...args: Args) => Promise<Response>) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      if (isApiError(error)) {
        const retry = (error.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds;
        return errorResponse(error, retry ? { "retry-after": String(retry) } : undefined);
      }
      console.error("Unhandled API error", error);
      return errorResponse(new ApiError(500, "internal_error", "Error interno del servidor."));
    }
  };
}
