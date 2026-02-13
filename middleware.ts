import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/account", "/checkout", "/dashboard", "/products", "/orders", "/customers", "/users", "/categories", "/audit-log"];
const AUTH_PATHS = ["/auth/"];
const SESSION_COOKIE = "better-auth.session_token";

// Cookie-only checks for fast Edge redirects.
// Full session validation (expiry, DB lookup) is handled by page-level guards
// (requireAuth, requireAdmin in lib/auth/guards.ts). A stale cookie may cause
// a brief page flash before the server guard redirects — this is an acceptable
// trade-off for Edge runtime compatibility on Cloudflare Workers.
export function middleware(request: NextRequest) {
  const { hostname, pathname } = request.nextUrl;

  // Redirect www → apex for SEO canonicalization
  if (hostname === "www.netereka.ci") {
    const url = request.nextUrl.clone();
    url.hostname = "netereka.ci";
    return NextResponse.redirect(url, 301);
  }

  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isProtectedPath = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (!isAuthPath && !isProtectedPath) return NextResponse.next();

  const hasCookie = request.cookies.has(SESSION_COOKIE);

  // No cookie on protected page → redirect to sign-in
  if (isProtectedPath && !hasCookie) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Has cookie on auth page → redirect to home (already signed in)
  if (isAuthPath && hasCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/checkout/:path*",
    "/auth/:path*",
    "/dashboard/:path*",
    "/products/:path*",
    "/orders/:path*",
    "/customers/:path*",
    "/users/:path*",
    "/categories/:path*",
    "/audit-log/:path*",
    // www redirect — match all paths
    { source: "/(.*)", has: [{ type: "host", value: "www.netereka.ci" }] },
  ],
};
