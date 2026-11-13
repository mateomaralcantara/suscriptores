import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, refreshSupabaseSession, setSessionCookies } from "@/lib/auth-cookies";

const isApi = (pathname: string) => pathname.startsWith("/api/");

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (request.cookies.get(ACCESS_COOKIE)?.value) return NextResponse.next();

  // The access token expired: renew it transparently with the refresh token.
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const session = refreshToken ? await refreshSupabaseSession(refreshToken) : null;
  if (session?.access_token) {
    request.cookies.set(ACCESS_COOKIE, session.access_token);
    const response = NextResponse.next({ request: { headers: request.headers } });
    setSessionCookies(response, session);
    return response;
  }

  // API routes answer 401 themselves; pages go to the login screen.
  if (isApi(pathname)) {
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
    "/dashboard/:path*",
    "/admin/:path*",
    "/orders/:path*",
    "/services/:path*",
    "/tickets/:path*",
    "/transactions/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/affiliates/:path*",
    "/child-panels/:path*",
    "/add-funds/:path*",
    "/api-docs/:path*",
    "/api/v1/:path*",
    "/api/admin/:path*",
    "/api/tickets/:path*",
    "/api/account/:path*",
    "/api/payments/checkout",
    "/api/auth/me",
  ],
};
