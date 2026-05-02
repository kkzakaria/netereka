import { z } from "zod";
import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";

/**
 * Admin-typed prompt for AI product generation.
 * Trim → reject control chars → length bounds. 3–200 chars feels natural
 * for product names (brand + model + capacity).
 */
export const aiPromptSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => !/[\u0000-\u001F\u007F]/.test(v), {
    message: "Caractères de contrôle interdits",
  })
  .refine((v) => v.length >= 3, { message: "Prompt trop court (min 3 caractères)" })
  .refine((v) => v.length <= 200, { message: "Prompt trop long (max 200 caractères)" });

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide (format #rrggbb)");

const colorSchema = z.object({
  name: z.string().trim().min(1).max(40),
  hex: hexColor,
});

const dimensionsSchema = z.object({
  length_mm: z.number().int().positive().optional(),
  height_mm: z.number().int().positive().optional(),
  width_mm:  z.number().int().positive().optional(),
  weight_g:  z.number().int().positive().optional(),
});

const specSchema = z.object({
  name:  z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
});

// Icon list reused from product-story — keeps the UI and AI in lockstep.
const highlightSchema = z.object({
  icon: z.enum(HIGHLIGHT_ICON_NAMES),
  label: z.string().trim().min(1).max(80),
});

const featureBlockSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body:  z.string().trim().min(1).max(600),
});

const faqSchema = z.object({
  question: z.string().trim().min(1).max(160),
  answer:   z.string().trim().min(1).max(600),
});

export const aiProductOutputSchema = z.object({
  name: z.string().trim().min(1).max(150),
  brand: z.string().trim().max(80).optional(),
  category_suggestion: z.string().trim().min(1),
  short_description: z.string().trim().max(120).optional(),
  description_html: z.string().optional(),
  attributes: z.object({
    colors: z.array(colorSchema).max(12).default([]),
    dimensions: dimensionsSchema.default({}),
    specs: z.array(specSchema).max(20).default([]),
  }).default({ colors: [], dimensions: {}, specs: [] }),
  story: z.object({
    tagline: z.string().trim().max(200).optional(),
    highlights: z.array(highlightSchema).min(3).max(6).optional(),
    feature_blocks: z.array(featureBlockSchema).min(2).max(4).optional(),
    faq: z.array(faqSchema).max(5).optional(),
  }).default({}),
  seo: z.object({
    meta_title: z.string().trim().max(60).optional(),
    meta_description: z.string().trim().max(160).optional(),
  }).default({}),
  // min:0 — Claude must be allowed to honestly return [] when web_search
  // didn't surface any image URL it can copy verbatim. Forcing min:1 made it
  // hallucinate URL patterns (e.g. cdn.gsmarena.com/vv/pics/{model}-{N}.jpg)
  // that 404'd at display and import time. Admin fills images manually if 0.
  image_candidates: z.array(z.object({
    url: z.string().url(),
    source_domain: z.string().min(1),
    alt: z.string().max(200).optional(),
  })).max(12).default([]),
});

export const aiNotFoundSchema = z.object({
  not_found: z.literal(true),
  reason: z.string().max(300),
});

export type AiProductOutput = z.infer<typeof aiProductOutputSchema>;

export type AiToolInputResult =
  | { kind: "ok"; output: AiProductOutput }
  | { kind: "not_found"; reason: string }
  | { kind: "invalid"; issues: z.ZodIssue[] };

/** Try not-found first — it has a discriminating literal — then the full schema. */
export function parseAiToolInput(raw: unknown): AiToolInputResult {
  const nf = aiNotFoundSchema.safeParse(raw);
  if (nf.success) return { kind: "not_found", reason: nf.data.reason };

  const ok = aiProductOutputSchema.safeParse(raw);
  if (ok.success) return { kind: "ok", output: ok.data };
  return { kind: "invalid", issues: ok.error.issues };
}
