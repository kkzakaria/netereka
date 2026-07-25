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
  // Storefront read stays on the cache-backed path (no `query` key — see the
  // dedicated test pinning this) rather than paying a D1 read on every
  // authenticated request. That cached cookie payload already carries
  // `banned`/`banExpires` (better-auth's admin plugin declares them without
  // `returned: false`, so the cache-write and cache-read parsers both keep
  // them), so this check is free: it enforces a ban within the cache's
  // configured TTL instead of forcing a fresh read on the storefront.
  if (isActivelyBanned(session.user)) redirect("/");
  return session as Session;
}

// Privileged guards require an authoritative read of session state rather
// than the signed cookie's last-known snapshot, so a ban or role change is
// enforced starting with the very next admin request. `disableCookieCache`
// makes better-auth's /get-session handler skip its cache branch and
// re-read session + user from D1 (better-auth/dist/api/routes/session.mjs).
// This intentionally bypasses requireAuth() rather than calling it, so the
// storefront keeps its existing cache-backed read path.
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
function isActivelyBanned(user: Pick<Session["user"], "banned" | "banExpires">): boolean {
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
