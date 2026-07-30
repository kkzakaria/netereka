import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { initAuth, type Session } from "@/lib/auth";
// One implementation of "is this ban in force?", shared with the WhatsApp
// Worker (workers/whatsapp/src/tools/guards.ts). See lib/auth/ban.ts for why
// it must not be re-written per channel.
import { isActivelyBanned } from "@/lib/auth/ban";
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

// `isActivelyBanned` deliberately does not live here any more: the WhatsApp
// Worker enforces the same rule and cannot import this module (it pulls in
// `next/navigation`). The predicate — permanent ban vs expired ban, and the
// three runtime shapes `banExpires` arrives in on this path alone — is
// documented in lib/auth/ban.ts.
//
// Worth knowing at these call sites: `Session["user"]["banExpires"]` is typed
// `Date`, but that only holds on a fresh D1 read. requireAuth's normal path
// reads the session-cache cookie, whose cache-hit branch
// (better-auth/dist/api/routes/session.mjs) re-hydrates only
// `createdAt`/`updatedAt` into `Date`s — `banExpires` comes straight out of
// `JSON.parse` as an ISO string. The shared predicate accepts both.

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

// Deliberately does not check isActivelyBanned(): this only gates *guest-only*
// pages (redirects an authenticated caller away). A banned user is still an
// authenticated user for this purpose. If a caller ever needs "authenticated
// and not banned", use requireAuth() instead of this function.
export async function requireGuest(): Promise<void> {
  const auth = await initAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (session) redirect("/");
}

// Deliberately does not check isActivelyBanned(): this returns whatever
// session exists, banned or not, for callers that only need to know who (if
// anyone) is signed in. A caller that needs "authenticated and not banned"
// must check isActivelyBanned() itself or use requireAuth() instead.
export async function getOptionalSession(): Promise<Session | null> {
  const auth = await initAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return (session as Session) ?? null;
}
