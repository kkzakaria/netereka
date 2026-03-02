import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { initAuth, type Session } from "@/lib/auth";

export type AdminSession = Omit<Session, "user"> & {
  user: Omit<Session["user"], "role"> & { role: "admin" | "super_admin" };
};

export type AnyAdminSession = Omit<Session, "user"> & {
  user: Omit<Session["user"], "role"> & { role: "agent" | "admin" | "super_admin" };
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

export async function requireAnyAdmin(): Promise<AnyAdminSession> {
  const session = await requireAuth();
  const role = session.user.role;
  if (role !== "agent" && role !== "admin" && role !== "super_admin") {
    redirect("/");
  }
  return session as AnyAdminSession;
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await requireAuth();
  const role = session.user.role;
  if (role !== "admin" && role !== "super_admin") redirect("/");
  return session as AdminSession;
}

export async function requireSuperAdmin(): Promise<SuperAdminSession> {
  const session = await requireAuth();
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
