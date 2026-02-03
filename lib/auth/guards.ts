import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { initAuth, type Session } from "@/lib/auth";
import {
  hasPermission,
  hasAnyPermission,
  type Permission,
  type TeamRole,
} from "@/lib/permissions";
import { getTeamMemberByUserId } from "@/lib/db/admin/team";

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

  // All team roles (except customer) can access admin
  const teamRoles: TeamRole[] = ["super_admin", "admin", "delivery", "support", "accountant"];
  if (!teamRoles.includes(role as TeamRole)) {
    redirect("/");
  }

  return session;
}

/**
 * Require a specific permission to access a page/action
 */
export async function requirePermission(permission: Permission): Promise<Session> {
  const session = await requireAdmin();
  const role = session.user.role;

  // Super admin has all permissions
  if (role === "super_admin") {
    return session;
  }

  // Get team member to check custom permissions
  const teamMember = await getTeamMemberByUserId(session.user.id);
  const userPermissions = teamMember?.permissions ?? null;

  if (!hasPermission(role as TeamRole, userPermissions, permission)) {
    redirect("/dashboard?error=unauthorized");
  }

  return session;
}

/**
 * Require any of the specified permissions
 */
export async function requireAnyPermission(permissions: Permission[]): Promise<Session> {
  const session = await requireAdmin();
  const role = session.user.role;

  // Super admin has all permissions
  if (role === "super_admin") {
    return session;
  }

  // Get team member to check custom permissions
  const teamMember = await getTeamMemberByUserId(session.user.id);
  const userPermissions = teamMember?.permissions ?? null;

  if (!hasAnyPermission(role as TeamRole, userPermissions, permissions)) {
    redirect("/dashboard?error=unauthorized");
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

/**
 * Check if current user has a permission (for use in components)
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const auth = await initAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return false;

  const role = session.user.role;
  if (role === "customer") return false;
  if (role === "super_admin") return true;

  const teamMember = await getTeamMemberByUserId(session.user.id);
  const userPermissions = teamMember?.permissions ?? null;

  return hasPermission(role as TeamRole, userPermissions, permission);
}
