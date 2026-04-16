import {
  highlightsSchema,
  featureBlocksSchema,
  faqSchema,
} from "@/lib/validations/product-story";
import type {
  ProductHighlight,
  ProductFeatureBlock,
  ProductFaqItem,
} from "@/lib/db/types";

/**
 * Row shape as returned by raw D1 queries: JSON columns are strings.
 * After hydration, they become typed arrays (or null on absence / malformed JSON).
 */
export interface StoryRawFields {
  tagline: string | null;
  highlights: string | null;
  feature_blocks: string | null;
  faq: string | null;
}

export interface StoryHydratedFields {
  tagline: string | null;
  highlights: ProductHighlight[] | null;
  feature_blocks: ProductFeatureBlock[] | null;
  faq: ProductFaqItem[] | null;
}

function parseWith<T>(
  raw: string | null,
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T } },
  label: string,
): T | null {
  if (raw == null || raw === "") return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`[product-story] malformed JSON in column ${label} — falling back to null`, err);
    return null;
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    console.error(`[product-story] JSON failed ${label} schema validation — falling back to null`, {
      raw: raw.slice(0, 120),
    });
    return null;
  }
  return result.data ?? null;
}

export function parseHighlights(raw: string | null): ProductHighlight[] | null {
  return parseWith(raw, highlightsSchema, "highlights");
}

export function parseFeatureBlocks(raw: string | null): ProductFeatureBlock[] | null {
  return parseWith(raw, featureBlocksSchema, "feature_blocks");
}

export function parseFaq(raw: string | null): ProductFaqItem[] | null {
  return parseWith(raw, faqSchema, "faq");
}

/**
 * Takes a DB row that still has JSON strings in the story columns and returns
 * the same object with those columns hydrated to typed arrays (or null).
 * Used by `getProductBySlug` and `getAdminProductById`.
 */
export function hydrateProductStoryFields<T extends StoryRawFields>(
  row: T,
): Omit<T, keyof StoryRawFields> & StoryHydratedFields {
  return {
    ...row,
    tagline: row.tagline ?? null,
    highlights: parseHighlights(row.highlights),
    feature_blocks: parseFeatureBlocks(row.feature_blocks),
    faq: parseFaq(row.faq),
  };
}
