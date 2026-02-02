import { z } from "zod";

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1, "Note requise").max(5),
  comment: z.string().max(1000).optional(),
});

export type ReviewInput = z.input<typeof reviewSchema>;
