"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { cancelOrder } from "@/lib/db/orders";

export async function cancelOrderAction(orderNumber: string) {
  const session = await requireAuth();
  const ok = await cancelOrder(orderNumber, session.user.id, "Annulée par le client");
  if (!ok) {
    return { success: false, error: "Impossible d'annuler cette commande" };
  }
  revalidatePath(`/account/orders/${orderNumber}`);
  revalidatePath("/account/orders");
  return { success: true };
}
