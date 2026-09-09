import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-growth-mode", "sandbox");
  response.headers.set("x-request-path", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/orders/:path*", "/tickets/:path*"],
};
