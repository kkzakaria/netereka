import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { initAuth } from "@/lib/auth";

export async function requireAuth() {
  const auth = await initAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/auth/sign-in");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (
    (session.user as Record<string, unknown>).role !== "admin" &&
    (session.user as Record<string, unknown>).role !== "super_admin"
  ) {
    redirect("/");
  }
  return session;
}

export async function getOptionalSession() {
  const auth = await initAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}
