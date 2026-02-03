"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";
import type { ActionResult } from "@/lib/utils";
import type { UserRole } from "@/lib/db/types";

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
    return { success: false, error: "ID client invalide" };
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
    "SELECT id, role FROM users WHERE id = ?",
    [customerId]
  );

  if (!user) {
    return { success: false, error: "Client introuvable" };
  }

  await execute(
    "UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?",
    [roleResult.data, customerId]
  );

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);

  return { success: true };
}

export async function toggleCustomerActive(
  customerId: string
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(customerId);
  if (!idResult.success) {
    return { success: false, error: "ID client invalide" };
  }

  // Check if user exists and get current status
  const user = await queryFirst<{ id: string; is_active: number | null }>(
    "SELECT id, is_active FROM users WHERE id = ?",
    [customerId]
  );

  if (!user) {
    return { success: false, error: "Client introuvable" };
  }

  const currentActive = user.is_active ?? 1;
  const newActive = currentActive === 1 ? 0 : 1;

  await execute(
    "UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?",
    [newActive, customerId]
  );

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);

  return { success: true };
}
