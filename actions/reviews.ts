"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { reviewSchema, type ReviewInput } from "@/lib/validations/review";
import { createReview, canUserReview } from "@/lib/db/reviews";
import { queryFirst } from "@/lib/db";
import type { ActionResult } from "@/lib/types/actions";

export async function submitReview(input: ReviewInput): Promise<ActionResult> {
  const session = await requireAuth();
  const userId = session.user.id;

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Données invalides",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const allowed = await canUserReview(userId, parsed.data.productId);
  if (!allowed) {
    return {
      success: false,
      error: "Vous devez avoir acheté et reçu ce produit pour laisser un avis",
    };
  }

  await createReview({
    productId: parsed.data.productId,
    userId,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
    isVerifiedPurchase: true,
  });

  // Get product slug for targeted revalidation
  const product = await queryFirst<{ slug: string }>(
    "SELECT slug FROM products WHERE id = ?",
    [parsed.data.productId]
  );

  revalidatePath(`/account/reviews`);
  if (product) revalidatePath(`/p/${product.slug}`);
  return { success: true };
}
