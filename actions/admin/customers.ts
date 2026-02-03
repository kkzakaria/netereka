"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";
import type { ActionResult } from "@/lib/utils";

const idSchema = z.string().min(1, "ID requis");

export async function toggleCustomerActive(
  customerId: string
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(customerId);
  if (!idResult.success) {
    return { success: false, error: "ID client invalide" };
  }

  // Check if customer exists and get current status
  const customer = await queryFirst<{ id: string; is_active: number }>(
    "SELECT id, is_active FROM customers WHERE id = ?",
    [customerId]
  );

  if (!customer) {
    return { success: false, error: "Client introuvable" };
  }

  const newActive = customer.is_active === 1 ? 0 : 1;

  await execute(
    "UPDATE customers SET is_active = ?, updated_at = datetime('now') WHERE id = ?",
    [newActive, customerId]
  );

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);

  return { success: true };
}
