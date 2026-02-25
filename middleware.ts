import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const PROTECTED_PATHS = ["/account", "/checkout", "/dashboard", "/products", "/orders", "/customers", "/users", "/categories", "/audit-log"];
const SESSION_COOKIE = "better-auth.session_token";
const SECURE_SESSION_COOKIE = "__Secure-better-auth.session_token";
const KV_HERO_PRELOAD_KEY = "hero:lcp:preload-url";

export async function middleware(request: NextRequest) {
  const { hostname, pathname } = request.nextUrl;

  // Redirect www → apex for SEO canonicalization
  if (hostname === "www.netereka.ci") {
    const url = request.nextUrl.clone();
    url.hostname = "netereka.ci";
    return NextResponse.redirect(url, 301);
  }

  // Add Link preload header for homepage LCP — browser starts hero image fetch at TTFB
  if (pathname === "/") {
    try {
      const { env } = await getCloudflareContext();
      const linkValue = await env.KV.get(KV_HERO_PRELOAD_KEY);
      if (linkValue) {
        const response = NextResponse.next();
        response.headers.set("Link", linkValue);
        return response;
      }
    } catch (err) {
      // Expected in local dev without wrangler bindings; should not fire in production.
      if (process.env.NODE_ENV === "production") {
        console.error("[middleware] KV read failed for hero preload header:", err);
      }
    }
  }

  const isProtectedPath = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (!isProtectedPath) return NextResponse.next();

  const hasCookie = request.cookies.has(SESSION_COOKIE) || request.cookies.has(SECURE_SESSION_COOKIE);

  // No cookie on protected page → redirect to sign-in
  if (!hasCookie) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/account/:path*",
    "/checkout/:path*",
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
