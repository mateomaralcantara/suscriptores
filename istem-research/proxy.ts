import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, refreshSession, setSessionCookies } from "@/lib/auth-cookies";

export const PROTECTED_SECTIONS = ["inicio", "proyectos", "muestras", "modulos", "administracion", "configuracion", "organizacion"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (request.cookies.get(ACCESS_COOKIE)?.value) return NextResponse.next();

  // Token de acceso vencido: se renueva de forma transparente con el refresh token.
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const session = refreshToken ? await refreshSession(refreshToken) : null;
  if (session?.access_token) {
    request.cookies.set(ACCESS_COOKIE, session.access_token);
    const response = NextResponse.next({ request: { headers: request.headers } });
    setSessionCookies(response, session);
    return response;
  }

  // Las rutas API responden 401 por sí mismas; las páginas van al inicio de sesión.
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    if (refreshToken) clearSessionCookies(response);
    return response;
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  const response = NextResponse.redirect(login);
  if (refreshToken) clearSessionCookies(response);
  return response;
}

export const config = {
  matcher: [
    "/inicio/:path*",
    "/proyectos/:path*",
    "/muestras/:path*",
    "/modulos/:path*",
    "/administracion/:path*",
    "/configuracion/:path*",
    "/organizacion/:path*",
    "/api/v1/:path*",
    "/api/session/:path*",
  ],
};
