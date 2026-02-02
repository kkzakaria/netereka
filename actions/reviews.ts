"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { reviewSchema, type ReviewInput } from "@/lib/validations/review";
import { createReview, canUserReview } from "@/lib/db/reviews";

interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

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

  revalidatePath(`/account/reviews`);
  revalidatePath(`/p/[slug]`, "page");
  return { success: true };
}
