"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth/guards";
import { initAuth } from "@/lib/auth";
import { queryFirst, batch } from "@/lib/db";
import { prepareAuditLog } from "@/lib/db/admin/audit-log";
import type { ActionResult } from "@/lib/utils";
import type { UserRole } from "@/lib/db/types";
import { ROLE_LABELS } from "@/lib/constants/customers";

const idSchema = z.string().min(1, "ID requis");

const staffRoleSchema = z.enum(["agent", "admin", "super_admin"], {
  message: "Rôle invalide",
});

export async function updateUserRole(
  userId: string,
  newRole: "agent" | "admin" | "super_admin"
): Promise<ActionResult> {
  const session = await requireSuperAdmin();

  const idResult = idSchema.safeParse(userId);
  if (!idResult.success) return { success: false, error: "ID utilisateur invalide" };

  const roleResult = staffRoleSchema.safeParse(newRole);
  if (!roleResult.success) return { success: false, error: roleResult.error.issues[0].message };

  // Prevent self-demotion
  if (userId === session.user.id && newRole !== "super_admin") {
    return { success: false, error: "Vous ne pouvez pas modifier votre propre rôle" };
  }

  const user = await queryFirst<{ id: string; role: string }>(
    "SELECT id, role FROM user WHERE id = ?",
    [userId]
  );
  if (!user) return { success: false, error: "Utilisateur introuvable" };

  // Forbid promoting a customer to staff
  if (user.role === "customer") {
    return {
      success: false,
      error: "Impossible de promouvoir un client en staff. Créez un compte dédié.",
    };
  }

  const oldRole = user.role as UserRole;

  const auth = await initAuth();
  try {
    await auth.api.setRole({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: { userId, role: roleResult.data as any },
      headers: await headers(),
    });
  } catch (error) {
    console.error("[admin/customers] setRole failed for userId:", userId, error);
    return { success: false, error: "Erreur lors du changement de rôle" };
  }

  try {
    const auditStmt = await prepareAuditLog({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "user.role_changed",
      targetType: "user",
      targetId: userId,
      details: JSON.stringify({
        from: oldRole,
        to: roleResult.data,
        fromLabel: ROLE_LABELS[oldRole],
        toLabel: ROLE_LABELS[roleResult.data],
      }),
    });
    await batch([auditStmt]);
  } catch (auditError) {
    console.error("[admin/customers] audit log failed after setRole for userId:", userId, auditError);
  }

  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  return { success: true };
}

export async function banCustomer(userId: string, reason?: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const idResult = idSchema.safeParse(userId);
  if (!idResult.success) return { success: false, error: "ID utilisateur invalide" };

  const user = await queryFirst<{ id: string }>(
    "SELECT id FROM user WHERE id = ?",
    [userId]
  );
  if (!user) return { success: false, error: "Utilisateur introuvable" };

  const auth = await initAuth();
  try {
    await auth.api.banUser({
      body: { userId, banReason: reason },
      headers: await headers(),
    });
  } catch (error) {
    console.error("[admin/customers] banUser failed for userId:", userId, error);
    return { success: false, error: "Erreur lors du bannissement de l'utilisateur" };
  }

  try {
    const auditStmt = await prepareAuditLog({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "user.banned",
      targetType: "user",
      targetId: userId,
      details: reason ? JSON.stringify({ reason }) : undefined,
    });
    await batch([auditStmt]);
  } catch (auditError) {
    console.error("[admin/customers] audit log failed after banUser for userId:", userId, auditError);
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${userId}`);
  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  return { success: true };
}

export async function unbanCustomer(userId: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const idResult = idSchema.safeParse(userId);
  if (!idResult.success) return { success: false, error: "ID utilisateur invalide" };

  const user = await queryFirst<{ id: string }>(
    "SELECT id FROM user WHERE id = ?",
    [userId]
  );
  if (!user) return { success: false, error: "Utilisateur introuvable" };

  const auth = await initAuth();
  try {
    await auth.api.unbanUser({
      body: { userId },
      headers: await headers(),
    });
  } catch (error) {
    console.error("[admin/customers] unbanUser failed for userId:", userId, error);
    return { success: false, error: "Erreur lors du débannissement de l'utilisateur" };
  }

  try {
    const auditStmt = await prepareAuditLog({
      actorId: session.user.id,
      actorName: session.user.name,
      action: "user.unbanned",
      targetType: "user",
      targetId: userId,
    });
    await batch([auditStmt]);
  } catch (auditError) {
    console.error("[admin/customers] audit log failed after unbanUser for userId:", userId, auditError);
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${userId}`);
  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  return { success: true };
}
