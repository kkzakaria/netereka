import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PATHS = ["/account", "/checkout"];
const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/forgot-password"];
const SESSION_COOKIE = "netereka_session";

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  try {
    // JWT_SECRET must be available via env. In Edge Runtime on Cloudflare,
    // we read it from process.env (set via wrangler vars).
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;
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
