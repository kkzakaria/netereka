import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getUserSafe, type SafeUser } from "@/lib/db/users";

export async function requireAuth(): Promise<SafeUser> {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const user = await getUserSafe(session.userId);
  if (!user) redirect("/auth/login");

  return user;
}

export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireAuth();
  if (user.role !== "admin" && user.role !== "super_admin") {
    redirect("/");
  }
  return user;
}

export async function requireGuest(): Promise<void> {
  const session = await getSession();
  if (session) redirect("/");
}

export async function getOptionalUser(): Promise<SafeUser | null> {
  const session = await getSession();
  if (!session) return null;
  return getUserSafe(session.userId);
}
