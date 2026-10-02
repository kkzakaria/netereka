import { z } from "zod";
import { colorSchema, dimensionsSchema, specSchema } from "@/lib/validations/product-attributes";

/**
 * Input contracts of the MCP product tools (lib/mcp/tools/products.ts).
 * Attribute rules are the wizard's own schemas, reused so the MCP cannot
 * write a product the admin UI would reject.
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

/**
 * Champs retirés du contrat produit : les quatre colonnes Story (`tagline`,
 * `highlights`, `feature_blocks`, `faq`) et l'objet `story` qui les portait
 * avant la 2.0.0. Leur contenu a été converti en HTML libre — la Description
 * et la FAQ sont désormais les deux seuls porteurs de contenu éditorial d'une
 * fiche.
 *
 * POURQUOI LES DÉCLARER PLUTÔT QUE LES LAISSER INCONNUS : un `z.object` Zod
 * ÉLAGUE les clés qu'il ne connaît pas, il ne les refuse pas. Un client resté
 * sur l'ancien contrat envoyait donc `tagline` et recevait un succès — la
 * fiche écrite sans son accroche, et pas un mot sur ce qui avait été jeté.
 * Sur un brouillon, `updateDraft` allait jusqu'à ne poser que `updated_at` et
 * rendre `{ id, slug }` : un succès complet pour une écriture vide. Déclarés
 * en `z.never()`, ces champs produisent à la place un refus nommé qui dit quoi
 * employer ; `.optional()` garde le cas normal — champ absent — valide, et la
 * conversion en JSON Schema (`{ "not": {} }`, hors `required`) les montre
 * comme refusés dans `tools/list`.
 */
function retiredStoryField(hint: string) {
  return z.never({ error: hint }).optional();
}

const RETIRED_STORY_FIELDS = {
  story: retiredStoryField(
    "`story` a été retiré du contrat : composez le contenu éditorial dans `description_html` " +
      "(onglet Description) et les questions dans `faq_html` (onglet FAQ).",
  ),
  tagline: retiredStoryField(
    "`tagline` a été retiré du contrat : placez l'accroche en tête de `description_html`, " +
      "par exemple dans un <p class=\"nk-lead\">.",
  ),
  highlights: retiredStoryField(
    "`highlights` a été retiré du contrat : composez les points forts dans `description_html`, " +
      "par exemple une <ul class=\"nk-grid\"> de <li class=\"nk-card\">.",
  ),
  feature_blocks: retiredStoryField(
    "`feature_blocks` a été retiré du contrat : composez les blocs dans `description_html`, " +
      "par exemple des <div class=\"nk-split\">.",
  ),
  faq: retiredStoryField(
    "`faq` a été retiré du contrat : employez `faq_html`, une suite de " +
      "<details><summary>Question</summary><p>Réponse</p></details> dans un <div class=\"nk-faq\">.",
  ),
} as const;

export const createDraftSchema = z.object({
  name: z.string().trim().min(1).max(150),
  category_id: idSchema,
  brand: z.string().trim().max(80).nullable().optional(),
  short_description: z.string().trim().max(120).nullable().optional(),
  description_html: z.string().max(DESCRIPTION_MAX_BYTES).nullable().optional(),
  faq_html: z.string().max(DESCRIPTION_MAX_BYTES).nullable().optional(),
  seo: seoSchema.optional(),
  attributes: draftAttributesSchema.optional(),
  pricing: pricingSchema.optional(),
  ...RETIRED_STORY_FIELDS,
});

/** Les noms que `RETIRED_STORY_FIELDS` refuse — lus par le test de
 *  non-régression du contrat, pour qu'un champ ajouté à l'un sans l'autre se
 *  voie. */
export const RETIRED_STORY_FIELD_NAMES = Object.keys(RETIRED_STORY_FIELDS) as readonly string[];

/**
 * An update replaces the whole attribute set, so every group must be explicit:
 * with the create-time defaults a colours-only patch would silently wipe the
 * stored specs and dimensions.
 */
export const updateAttributesSchema = z.object({
  colors: z.array(colorSchema).max(12),
  dimensions: dimensionsSchema,
  specs: z.array(specSchema).max(20),
});

export const updateDraftSchema = createDraftSchema.partial().extend({
  slug: z.string().trim().max(160).regex(SLUG_RE, "Slug invalide (minuscules, chiffres, tirets)").optional(),
  attributes: updateAttributesSchema.optional(),
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
