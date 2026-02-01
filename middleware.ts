import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { initAuth } from "@/lib/auth";
import { headers } from "next/headers";

const PROTECTED_PATHS = ["/account", "/checkout"];
const AUTH_PATHS = ["/auth/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isProtectedPath = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (!isAuthPath && !isProtectedPath) return NextResponse.next();

  const auth = await initAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect authenticated users away from all auth pages
  if (isAuthPath && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect unauthenticated users to sign-in for protected routes
  if (isProtectedPath && !session) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/account/:path*", "/checkout/:path*", "/auth/:path*"],
};
