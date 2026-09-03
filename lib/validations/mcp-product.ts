import { z } from "zod";
import { colorSchema, dimensionsSchema, specSchema } from "@/lib/validations/product-ai";
import { taglineSchema, highlightsSchema, featureBlocksSchema, faqSchema } from "@/lib/validations/product-story";

/**
 * Input contracts of the MCP product tools (lib/mcp/tools/products.ts).
 * Story and attribute rules are the wizard's own schemas, reused so the MCP
 * cannot write a product the admin UI would reject.
 */

export const idSchema = z.string().trim().min(1).max(64);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Upper bound of sanitizeDescriptionHtml's input (lib/utils/sanitize-html.ts). */
const DESCRIPTION_MAX_BYTES = 512_000;

export const draftAttributesSchema = z.object({
  colors: z.array(colorSchema).max(12).default([]),
  dimensions: dimensionsSchema.default({}),
  specs: z.array(specSchema).max(20).default([]),
});

const storyInputSchema = z.object({
  tagline: taglineSchema.optional(),
  highlights: highlightsSchema.optional(),
  feature_blocks: featureBlocksSchema.optional(),
  faq: faqSchema.optional(),
});

const seoSchema = z.object({
  meta_title: z.string().trim().max(60).nullable().optional(),
  meta_description: z.string().trim().max(160).nullable().optional(),
});

const pricingSchema = z.object({
  base_price: z.number().int().min(0).optional(),
  compare_price: z.number().int().min(0).nullable().optional(),
  sku: z.string().trim().min(1).max(64).nullable().optional(),
  stock_quantity: z.number().int().min(0).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
  weight_grams: z.number().int().positive().nullable().optional(),
});

export const createDraftSchema = z.object({
  name: z.string().trim().min(1).max(150),
  category_id: idSchema,
  brand: z.string().trim().max(80).nullable().optional(),
  short_description: z.string().trim().max(120).nullable().optional(),
  description_html: z.string().max(DESCRIPTION_MAX_BYTES).nullable().optional(),
  story: storyInputSchema.optional(),
  seo: seoSchema.optional(),
  attributes: draftAttributesSchema.optional(),
  pricing: pricingSchema.optional(),
});

export const updateDraftSchema = createDraftSchema.partial().extend({
  slug: z.string().trim().max(160).regex(SLUG_RE, "Slug invalide (minuscules, chiffres, tirets)").optional(),
});

export const addImagesSchema = z.object({
  images: z
    .array(z.object({
      url: z.string().url().max(2048).refine((u) => /^https?:\/\//i.test(u), "URL http(s) requise"),
      alt: z.string().trim().max(200).nullable().optional(),
    }))
    .min(1)
    .max(8),
});

export const setVariantsSchema = z.object({
  variants: z
    .array(z.object({
      color_name: z.string().trim().min(1).max(40),
      color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide (format #rrggbb)"),
      stock: z.number().int().min(0),
      price: z.number().int().min(0).nullable().optional(),
    }))
    .max(12),
  uniform_price: z.boolean().default(true),
});

export const searchProductsSchema = z.object({
  query: z.string().trim().min(3).max(100),
  limit: z.number().int().min(1).max(50).default(20),
});

export type DraftAttributesInput = z.infer<typeof draftAttributesSchema>;
export type CreateDraftInput = z.infer<typeof createDraftSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
export type AddImagesInput = z.infer<typeof addImagesSchema>;
export type SetVariantsInput = z.infer<typeof setVariantsSchema>;
export type SearchProductsInput = z.infer<typeof searchProductsSchema>;
