import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { initAuth, type Session } from "@/lib/auth";

export async function requireAuth(): Promise<Session> {
  const auth = await initAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/auth/sign-in");
  return session as Session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  const role = session.user.role;
  if (role !== "admin" && role !== "super_admin") {
    redirect("/");
  }
  return session;
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
