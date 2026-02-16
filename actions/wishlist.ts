"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, getOptionalSession } from "@/lib/auth/guards";
import { atomicToggleWishlist, isInWishlist } from "@/lib/db/wishlist";
import { queryFirst } from "@/lib/db";
import { z } from "zod";

const productIdSchema = z.string().min(1).max(50);

export async function toggleWishlist(productId: string): Promise<{ success: boolean; added: boolean }> {
  const session = await requireAuth();
  const userId = session.user.id;

  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) {
    return { success: false, added: false };
  }

  // Verify product exists
  const product = await queryFirst<{ id: string }>(
    "SELECT id FROM products WHERE id = ?",
    [parsed.data]
  );
  if (!product) {
    return { success: false, added: false };
  }

  try {
    const added = await atomicToggleWishlist(userId, parsed.data);
    revalidatePath("/account/wishlist");
    return { success: true, added };
  } catch {
    return { success: false, added: false };
  }
}

export async function checkWishlist(productId: string): Promise<boolean> {
  const session = await getOptionalSession();
  if (!session) return false;
  return isInWishlist(session.user.id, productId);
}
