"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { slugify, type ActionResult } from "@/lib/utils";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { fetchAndUploadImage, type FetchImageResult } from "@/lib/ai/image-fetch";
import { deleteFromR2 } from "@/lib/storage/images";
import type { AiProductOutput } from "@/lib/validations/product-ai";
import { aiProductOutputSchema } from "@/lib/validations/product-ai";
import {
  taglineSchema,
  highlightsSchema,
  featureBlocksSchema,
  faqSchema,
} from "@/lib/validations/product-story";

type ImportResult = ActionResult & { id?: string; warnings?: string[] };

type FetchSuccess = Extract<FetchImageResult, { ok: true }>;

/** Create a draft + populate every AI-sourced field + attach selected images.
 *  Price, stock, SKU, visibility flags remain at their draft defaults; the admin
 *  fills them in the existing 5-step wizard on /products/{id}/edit. */
export async function importCandidateImages(
  aiOutput: AiProductOutput,
  selectedUrls: string[],
): Promise<ImportResult> {
  await requireAdmin();

  const outputParsed = aiProductOutputSchema.safeParse(aiOutput);
  if (!outputParsed.success) {
    return { success: false, error: "Fiche IA invalide" };
  }
  const output = outputParsed.data;

  const candidateSet = new Set(output.image_candidates.map((c) => c.url));
  if (selectedUrls.length > 8) {
    return { success: false, error: "Sélectionnez au plus 8 images" };
  }
  for (const u of selectedUrls) {
    if (!candidateSet.has(u)) return { success: false, error: "Sélection d'images invalide" };
  }

  const storyTagline      = taglineSchema.safeParse(output.story.tagline ?? null);
  const storyHighlights   = output.story.highlights     ? highlightsSchema.safeParse(output.story.highlights)    : { success: true as const, data: null };
  const storyFeatureBlocks = output.story.feature_blocks ? featureBlocksSchema.safeParse(output.story.feature_blocks) : { success: true as const, data: null };
  const storyFaq          = output.story.faq           ? faqSchema.safeParse(output.story.faq)                 : { success: true as const, data: null };
  if (!storyTagline.success || !storyHighlights.success || !storyFeatureBlocks.success || !storyFaq.success) {
    console.error("[admin/products-ai] story validation drift", {
      tagline: storyTagline.success ? null : storyTagline.error.issues,
      highlights: storyHighlights.success ? null : storyHighlights.error.issues,
      feature_blocks: storyFeatureBlocks.success ? null : storyFeatureBlocks.error.issues,
      faq: storyFaq.success ? null : storyFaq.error.issues,
    });
    return { success: false, error: "La story produit générée est invalide" };
  }
  const tagline = storyTagline.data;
  const highlights = storyHighlights.data;
  const featureBlocks = storyFeatureBlocks.data;
  const faq = storyFaq.data;

  const draftId = nanoid();
  const placeholderSlug = `draft-${draftId}`;
  try {
    await execute(
      `INSERT INTO products (id, category_id, name, slug, base_price, is_active, is_draft, created_at, updated_at)
       VALUES (?, NULL, '', ?, 0, 0, 1, datetime('now'), datetime('now'))`,
      [draftId, placeholderSlug],
    );
  } catch (err) {
    console.error("[admin/products-ai] draft insert failed", err);
    return { success: false, error: "Erreur lors de la création du brouillon" };
  }

  const category = await queryFirst<{ id: string }>(
    "SELECT id FROM categories WHERE LOWER(slug) = LOWER(?) LIMIT 1",
    [output.category_suggestion],
  );
  const categoryId = category?.id ?? null;

  const baseSlug = slugify(output.name);
  // Keep the placeholder slug if slugify produced nothing OR every candidate in 20 tries collided.
  // The placeholder is guaranteed unique (nanoid-based) so the batch UPDATE below won't throw on slug.
  let finalSlug = placeholderSlug;
  if (baseSlug) {
    let candidate = baseSlug;
    for (let suffix = 1; suffix <= 20; suffix++) {
      const taken = await queryFirst<{ id: string }>(
        "SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1",
        [candidate, draftId],
      );
      if (!taken) { finalSlug = candidate; break; }
      candidate = `${baseSlug}-${suffix + 1}`;
    }
  }

  const fetchResults = await Promise.all(
    selectedUrls.map((url) => fetchAndUploadImage(draftId, url).then((r) => ({ url, r }))),
  );
  const succeeded: Array<{ url: string; r: FetchSuccess }> = fetchResults.filter(
    (x): x is { url: string; r: FetchSuccess } => x.r.ok,
  );
  const failedDetails = fetchResults
    .filter((x): x is { url: string; r: Exclude<FetchImageResult, { ok: true }> } => !x.r.ok)
    .map((x) => ({ url: x.url, reason: x.r.reason }));
  const failed = failedDetails.map((x) => x.url);
  if (failedDetails.length > 0) {
    // Diagnostic: surface per-URL failure reasons so we can tell whether
    // images bounced on Referer/UA blocks (bad_status/bad_content_type) vs
    // hallucinated URLs (fetch_failed) vs size limits (too_large).
    console.error("[admin/products-ai] image fetch failures", failedDetails);
  }

  const descriptionHtml = output.description_html
    ? sanitizeDescriptionHtml(output.description_html, draftId)
    : null;

  const db = await getDB();
  const stmts: ReturnType<typeof db.prepare>[] = [];

  stmts.push(
    db.prepare(
      `UPDATE products SET
         category_id = ?, name = ?, slug = ?, brand = ?,
         description = ?, description_type = 'html', short_description = ?,
         meta_title = ?, meta_description = ?,
         tagline = ?, highlights = ?, feature_blocks = ?, faq = ?,
         updated_at = datetime('now')
       WHERE id = ? AND is_draft = 1`,
    ).bind(
      categoryId,
      output.name,
      finalSlug,
      output.brand ?? null,
      descriptionHtml,
      output.short_description ?? null,
      output.seo.meta_title ?? null,
      output.seo.meta_description ?? null,
      tagline,
      highlights ? JSON.stringify(highlights) : null,
      featureBlocks ? JSON.stringify(featureBlocks) : null,
      faq ? JSON.stringify(faq) : null,
      draftId,
    ),
  );

  for (const c of output.attributes.colors) {
    stmts.push(
      db.prepare(
        `INSERT INTO product_attributes (id, product_id, name, value) VALUES (?, ?, 'Couleur', ?)`,
      ).bind(nanoid(), draftId, `${c.name}|${c.hex}`),
    );
  }
  const dims = output.attributes.dimensions;
  const dimFields: Array<[string, number | undefined]> = [
    ["Longueur", dims.length_mm],
    ["Hauteur",  dims.height_mm],
    ["Largeur",  dims.width_mm],
    ["Poids",    dims.weight_g],
  ];
  for (const [label, val] of dimFields) {
    if (val != null) {
      stmts.push(
        db.prepare(`INSERT INTO product_attributes (id, product_id, name, value) VALUES (?, ?, ?, ?)`)
          .bind(nanoid(), draftId, label, String(val)),
      );
    }
  }
  for (const s of output.attributes.specs) {
    stmts.push(
      db.prepare(`INSERT INTO product_attributes (id, product_id, name, value) VALUES (?, ?, ?, ?)`)
        .bind(nanoid(), draftId, s.name, s.value),
    );
  }

  succeeded.forEach(({ url, r }, idx) => {
    const alt = output.image_candidates.find((c) => c.url === url)?.alt ?? null;
    stmts.push(
      db.prepare(
        `INSERT INTO product_images (id, product_id, url, alt, is_primary, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      ).bind(nanoid(), draftId, r.key, alt, idx === 0 ? 1 : 0, idx),
    );
  });

  try {
    await db.batch(stmts);
  } catch (err) {
    console.error("[admin/products-ai] batch write failed", err);
    // Compensating cleanup — the draft row, any pending attribute/image inserts,
    // and the R2 objects we uploaded must all be undone so retries stay idempotent
    // and no orphans survive. All failures here are logged but swallowed so the
    // original error reaches the caller.
    await Promise.allSettled([
      ...succeeded.map(({ r }) => deleteFromR2(r.key).catch((e) => {
        console.warn("[admin/products-ai] orphan R2 cleanup failed for key", r.key, e);
      })),
      execute("DELETE FROM products WHERE id = ?", [draftId]).catch((e) => {
        console.warn("[admin/products-ai] orphan draft cleanup failed for id", draftId, e);
      }),
    ]);
    return { success: false, error: "Erreur lors de l'enregistrement de la fiche IA" };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${draftId}/edit`);
  return { success: true, id: draftId, warnings: failed };
}
