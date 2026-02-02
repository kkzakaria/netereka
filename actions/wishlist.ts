"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { addToWishlist, removeFromWishlist, isInWishlist } from "@/lib/db/wishlist";

export async function toggleWishlist(productId: string): Promise<{ success: boolean; added: boolean }> {
  const session = await requireAuth();
  const userId = session.user.id;

  const exists = await isInWishlist(userId, productId);
  if (exists) {
    await removeFromWishlist(userId, productId);
  } else {
    await addToWishlist(userId, productId);
  }

  revalidatePath("/account/wishlist");
  return { success: true, added: !exists };
}
