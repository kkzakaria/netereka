import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { initAuth, type Session } from "@/lib/auth";
import type { StaffRole } from "@/lib/db/types";

export type AdminSession = Omit<Session, "user"> & {
  user: Omit<Session["user"], "role"> & { role: "admin" | "super_admin" };
};

export type AnyAdminSession = Omit<Session, "user"> & {
  user: Omit<Session["user"], "role"> & { role: StaffRole };
};

export type SuperAdminSession = Omit<Session, "user"> & {
  user: Omit<Session["user"], "role"> & { role: "super_admin" };
};

export async function requireAuth(): Promise<Session> {
  const auth = await initAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/auth/sign-in");
  return session as Session;
}

// Privileged guards cannot accept the signed session cookie at face value:
// session.cookieCache (lib/auth/index.ts) is enabled with a 5-minute
// lifetime so ordinary storefront requests skip a D1 round trip. A ban or
// role change made from the admin UI does not invalidate that cookie, so
// requireAuth()'s cached read could keep authorizing a revoked principal
// for up to 300s. `query: { disableCookieCache: true }` makes better-auth's
// /get-session handler skip its cache branch and re-read session + user
// from D1 (better-auth/dist/api/routes/session.mjs), so a revocation is
// enforced on the very next admin request. This intentionally bypasses
// requireAuth() rather than calling it, so the storefront's cache-backed
// path is untouched.
async function getFreshSession() {
  const auth = await initAuth();
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
}

// better-auth's admin plugin only clears an expired ban when a *new*
// session is created (sign-in) — an already-open session that reads as
// banned:true keeps that value forever unless banExpires has since passed,
// in which case it should no longer block access here.
function isActivelyBanned(user: { banned?: boolean | null; banExpires?: Date | null }): boolean {
  if (!user.banned) return false;
  if (!user.banExpires) return true;
  return new Date(user.banExpires).getTime() > Date.now();
}

export async function requireAnyAdmin(): Promise<AnyAdminSession> {
  const session = await getFreshSession();
  if (!session) redirect("/auth/sign-in");
  if (isActivelyBanned(session.user)) redirect("/");
  const role = session.user.role;
  if (role !== "agent" && role !== "admin" && role !== "super_admin") {
    redirect("/");
  }
  return session as AnyAdminSession;
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getFreshSession();
  if (!session) redirect("/auth/sign-in");
  if (isActivelyBanned(session.user)) redirect("/");
  const role = session.user.role;
  if (role !== "admin" && role !== "super_admin") redirect("/");
  return session as AdminSession;
}

export async function requireSuperAdmin(): Promise<SuperAdminSession> {
  const session = await getFreshSession();
  if (!session) redirect("/auth/sign-in");
  if (isActivelyBanned(session.user)) redirect("/");
  if (session.user.role !== "super_admin") redirect("/");
  return session as SuperAdminSession;
}

export async function requireGuest(): Promise<void> {
  const auth = await initAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (session) redirect("/");
}

export async function getOptionalSession(): Promise<Session | null> {
  const auth = await initAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return (session as Session) ?? null;
}
