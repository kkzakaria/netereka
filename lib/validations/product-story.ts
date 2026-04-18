import { z } from "zod";

/**
 * Curated shortlist of Hugeicons names used in product highlights.
 * Storefront icons module (`components/storefront/product-story/icons.ts`) must
 * expose a component for every name in this list. Removing a name here must
 * be coordinated with a DB cleanup of any product still referencing it.
 */
export const HIGHLIGHT_ICON_NAMES = [
  "battery",
  "battery-charging",
  "bluetooth",
  "bolt",
  "camera",
  "charge-fast",
  "cloud",
  "compass",
  "cpu",
  "dashboard",
  "display",
  "eye",
  "fingerprint",
  "flash",
  "gaming-pad",
  "gift",
  "globe",
  "gps",
  "headphones",
  "heart",
  "hourglass",
  "key",
  "leaf",
  "lock",
  "medal",
  "microphone",
  "moon",
  "music-note",
  "notification",
  "package",
  "palette",
  "printer",
  "ruler",
  "sd-card",
  "shield",
  "shield-check",
  "shopping-bag",
  "smart-phone",
  "sparkle",
  "speaker",
  "star",
  "sun",
  "tools",
  "truck",
  "tv",
  "usb",
  "video",
  "volume",
  "water-resistant",
  "wifi",
  "zap",
] as const;

export type HighlightIconName = (typeof HIGHLIGHT_ICON_NAMES)[number];

const iconSchema = z.enum(HIGHLIGHT_ICON_NAMES);

/** tagline → trimmed, empty → null, max 200 chars */
export const taglineSchema = z
  .union([z.string(), z.null()])
  .transform((v) => (v == null ? null : v.trim()))
  .transform((v) => (v === "" ? null : v))
  .pipe(z.string().max(200, "La tagline doit faire moins de 200 caractères").nullable());

export const highlightSchema = z.object({
  icon: iconSchema,
  label: z.string().trim().min(1, "Libellé requis").max(80, "Max 80 caractères"),
});

/** highlights → null (disabled) OR 3–6 items */
export const highlightsSchema = z
  .array(highlightSchema)
  .min(3, "Au moins 3 points forts")
  .max(6, "Au plus 6 points forts")
  .nullable();

export const featureBlockSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(120, "Max 120 caractères"),
  body: z.string().trim().min(1, "Texte requis").max(600, "Max 600 caractères"),
  image_url: z.string().min(1).max(500).nullable().optional(),
  image_alt: z.string().trim().max(200).nullable().optional(),
});

/** feature_blocks → null (disabled) OR 2–4 items */
export const featureBlocksSchema = z
  .array(featureBlockSchema)
  .min(2, "Au moins 2 blocs")
  .max(4, "Au plus 4 blocs")
  .nullable();

export const faqItemSchema = z.object({
  question: z.string().trim().min(1, "Question requise").max(160, "Max 160 caractères"),
  answer: z.string().trim().min(1, "Réponse requise").max(600, "Max 600 caractères"),
});

/** faq → null OR 0–5 items (empty array treated as "no faq") */
export const faqSchema = z
  .array(faqItemSchema)
  .max(5, "Au plus 5 questions")
  .nullable();

/** Aggregate shape sent from the admin form */
export const productStorySchema = z.object({
  tagline: taglineSchema,
  highlights: highlightsSchema,
  feature_blocks: featureBlocksSchema,
  faq: faqSchema,
});

export type ProductStoryInput = z.infer<typeof productStorySchema>;
