// Cookies de sesión (httpOnly). Compartido por las rutas de auth y proxy.ts (sin next/headers).

export const ACCESS_COOKIE = "ir_access_token";
export const REFRESH_COOKIE = "ir_refresh_token";
export const ORG_COOKIE = "ir_org";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

type CookieWriter = { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => unknown } };
export type SessionTokens = { access_token?: string; refresh_token?: string; expires_in?: number };

export function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
}

export function setSessionCookies(response: CookieWriter, session: SessionTokens) {
  if (session.access_token) {
    const maxAge = Math.max(60, (session.expires_in ?? 3600) - 60);
    response.cookies.set(ACCESS_COOKIE, session.access_token, { ...cookieOptions(), maxAge });
  }
  if (session.refresh_token) {
    response.cookies.set(REFRESH_COOKIE, session.refresh_token, { ...cookieOptions(), maxAge: REFRESH_MAX_AGE });
  }
}

export function clearSessionCookies(response: CookieWriter) {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, ORG_COOKIE]) {
    response.cookies.set(name, "", { ...cookieOptions(), maxAge: 0 });
  }
}

export async function refreshSession(refreshToken: string): Promise<SessionTokens | null> {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey || !refreshToken) return null;
  try {
    const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const session = (await response.json()) as SessionTokens;
    return session.access_token ? session : null;
  } catch {
    return null;
  }
}
