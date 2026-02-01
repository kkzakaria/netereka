import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const PROTECTED_PATHS = ["/account", "/checkout"];
const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/forgot-password"];
const SESSION_COOKIE = "netereka_session";

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  try {
    // Try Cloudflare context first, fall back to process.env
    let secret: string | undefined;
    try {
      const { env } = await getCloudflareContext();
      secret = (env as CloudflareEnv).JWT_SECRET;
    } catch {
      secret = process.env.JWT_SECRET;
    }

    if (!secret) {
      console.warn("JWT_SECRET not available in middleware — session validation skipped");
      return false;
    }

    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const valid = await hasValidSession(request);

  // Redirect authenticated users away from auth pages
  if (AUTH_PATHS.some((p) => pathname.startsWith(p)) && valid) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect unauthenticated users to login for protected routes
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !valid) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/checkout/:path*", "/auth/:path*"],
};
