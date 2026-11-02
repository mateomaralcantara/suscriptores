import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "gr_access_token";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next();
  response.headers.set("x-request-path", request.nextUrl.pathname);
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
  ],
};
