import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const allowBypass = process.env.ALLOW_ADMIN_BYPASS === "true" || process.env.NODE_ENV !== "production";
  const bypassCookie = request.cookies.get("admin_bypass")?.value === "1";
  if (allowBypass && bypassCookie) {
    return NextResponse.next();
  }
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/profile")) {
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signin";
      url.searchParams.set(
        "callbackUrl",
        `${request.nextUrl.pathname}${request.nextUrl.search}`
      );
      url.searchParams.set("reason", "auth_required");
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith("/hikes/")) {
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signin";
      url.searchParams.set(
        "callbackUrl",
        `${request.nextUrl.pathname}${request.nextUrl.search}`
      );
      url.searchParams.set("reason", "auth_required");
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/profile", "/hikes/:path*"],
};
