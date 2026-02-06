"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { queryFirst, batch } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { prepareAuditLog } from "@/lib/db/admin/audit-log";
import type { ActionResult } from "@/lib/utils";
import type { UserRole } from "@/lib/db/types";
import { ROLE_LABELS } from "@/lib/constants/customers";

const idSchema = z.string().min(1, "ID requis");

const roleSchema = z.enum(["customer", "admin", "super_admin"], {
  message: "Rôle invalide",
});

export async function updateCustomerRole(
  customerId: string,
  newRole: UserRole
): Promise<ActionResult> {
  const session = await requireAdmin();

  // Only super_admin can change roles
  if (session.user.role !== "super_admin") {
    return {
      success: false,
      error: "Seuls les super administrateurs peuvent modifier les rôles",
    };
  }

  const idResult = idSchema.safeParse(customerId);
  if (!idResult.success) {
    return { success: false, error: "ID utilisateur invalide" };
  }

  const roleResult = roleSchema.safeParse(newRole);
  if (!roleResult.success) {
    return { success: false, error: roleResult.error.issues[0].message };
  }

  // Prevent self-demotion
  if (customerId === session.user.id && newRole !== "super_admin") {
    return {
      success: false,
      error: "Vous ne pouvez pas modifier votre propre rôle",
    };
  }

  // Check if user exists
  const user = await queryFirst<{ id: string; role: string }>(
    "SELECT id, role FROM user WHERE id = ?",
    [customerId]
  );

  if (!user) {
    return { success: false, error: "Utilisateur introuvable" };
  }

  const oldRole = user.role as UserRole;

  const db = await getDB();
  const updateStmt = db
    .prepare(
      "UPDATE user SET role = ?, updatedAt = datetime('now') WHERE id = ?"
    )
    .bind(roleResult.data, customerId);

  const auditStmt = await prepareAuditLog({
    actorId: session.user.id,
    actorName: session.user.name,
    action: "user.role_changed",
    targetType: "user",
    targetId: customerId,
    details: JSON.stringify({
      from: oldRole,
      to: roleResult.data,
      fromLabel: ROLE_LABELS[oldRole],
      toLabel: ROLE_LABELS[roleResult.data],
    }),
  });

  await batch([updateStmt, auditStmt]);

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);

  return { success: true };
}

export async function toggleCustomerActive(
  customerId: string
): Promise<ActionResult> {
  const session = await requireAdmin();

  const idResult = idSchema.safeParse(customerId);
  if (!idResult.success) {
    return { success: false, error: "ID utilisateur invalide" };
  }

  // Check if user exists
  const user = await queryFirst<{ id: string }>(
    "SELECT id FROM user WHERE id = ?",
    [customerId]
  );

  if (!user) {
    return { success: false, error: "Utilisateur introuvable" };
  }

  // Note: better-auth user table doesn't have is_active column
  // This is a no-op placeholder until user status management is implemented
  const newActive = 0;

  const db = await getDB();
  const updateStmt = db
    .prepare(
      "UPDATE user SET updatedAt = datetime('now') WHERE id = ?"
    )
    .bind(customerId);

  const auditStmt = await prepareAuditLog({
    actorId: session.user.id,
    actorName: session.user.name,
    action: newActive === 1 ? "user.activated" : "user.deactivated",
    targetType: "user",
    targetId: customerId,
  });

  await batch([updateStmt, auditStmt]);

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);

  return { success: true };
}
