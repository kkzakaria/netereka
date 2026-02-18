import { z } from "zod";

export const productTextSchema = z.object({
  description: z.string().max(500),
  shortDescription: z.string().max(150),
  metaTitle: z.string().max(60),
  metaDescription: z.string().max(160),
});

export type ProductTextResult = z.infer<typeof productTextSchema>;

export const bannerTextSchema = z.object({
  title: z.string().max(200),
  subtitle: z.string().max(500),
  ctaText: z.string().max(50),
  badgeText: z.string().max(50).optional().default(""),
});

export type BannerTextResult = z.infer<typeof bannerTextSchema>;

export const categorySuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        categoryId: z.string(),
        categoryName: z.string(),
        confidence: z.number().min(0).max(1),
      })
    )
    .min(1)
    .max(3),
});

export type CategorySuggestionResult = z.infer<
  typeof categorySuggestionSchema
>;
