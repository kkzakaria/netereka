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

/**
 * price is intentionally absent from variant blueprints —
 * prices are set manually in the product editor after creation.
 */
export const productVariantBlueprintSchema = z.object({
  name: z.string().min(1).max(100),
  stock_quantity: z.coerce.number().int().min(0).max(9999).default(5),
  attributes: z.record(z.string(), z.string()).default({}),
});

/**
 * base_price is intentionally absent from product blueprints —
 * prices are set manually in the product editor after creation.
 */
export const productBlueprintSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().optional().default(""),
  description: z.string().min(1).max(500),
  short_description: z.string().min(1).max(150),
  meta_title: z.string().max(60),
  meta_description: z.string().max(160),
  // Must be a non-empty ID from the injected category list
  categoryId: z.string().min(1),
  // 0 variants is valid — variants can be added in the product editor
  variants: z.array(productVariantBlueprintSchema).max(20),
});

export type ProductVariantBlueprint = z.infer<
  typeof productVariantBlueprintSchema
>;
export type ProductBlueprint = z.infer<typeof productBlueprintSchema>;
