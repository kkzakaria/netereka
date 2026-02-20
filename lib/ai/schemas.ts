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

export const productVariantBlueprintSchema = z.object({
  name: z.string().min(1),
  stock_quantity: z.coerce.number().int().min(0).default(5),
  attributes: z.record(z.string(), z.string()).default({}),
});

export const productBlueprintSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional().default(""),
  base_price: z.coerce.number().int().min(0),
  description: z.string().max(500),
  short_description: z.string().max(150),
  meta_title: z.string().max(60),
  meta_description: z.string().max(160),
  categoryId: z.string(),
  variants: z.array(productVariantBlueprintSchema).min(0).max(20),
});

export type ProductVariantBlueprint = z.infer<
  typeof productVariantBlueprintSchema
>;
export type ProductBlueprint = z.infer<typeof productBlueprintSchema>;
