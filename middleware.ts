import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/account", "/checkout"];
const AUTH_PATHS = ["/auth/"];
const SESSION_COOKIE = "better-auth.session_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

  // Full session validation is handled by page-level guards
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/checkout/:path*", "/auth/:path*"],
};
