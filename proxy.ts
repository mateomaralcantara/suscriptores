import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { SESSION_COOKIE, sessionSecret } from "@/lib/config";

/** Gate for the private portal: no valid session → login; non-admins never reach /admin. */
export async function proxy(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, sessionSecret());
  const { pathname } = request.nextUrl;

  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/orders/:path*",
    "/tickets/:path*",
    "/services/:path*",
    "/add-funds/:path*",
    "/transactions/:path*",
    "/affiliates/:path*",
    "/child-panels/:path*",
    "/api-docs/:path*",
    "/settings/:path*",
    "/notifications/:path*",
  ],
};
