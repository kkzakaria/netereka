"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, query, queryFirst } from "@/lib/db";
import { slugify, type ActionResult } from "@/lib/utils";
import { deleteFromR2 } from "@/lib/storage/images";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import {
  taglineSchema,
  highlightsSchema,
  featureBlocksSchema,
  faqSchema,
} from "@/lib/validations/product-story";

const DB_CONSTRAINT_SKU = "UNIQUE constraint failed: products.sku";
const DB_CONSTRAINT_SLUG = "UNIQUE constraint failed: products.slug";

const idSchema = z.string().min(1, "ID requis");

// Sentinel string used to force Zod validation failure for non-parseable JSON inputs.
const INVALID_JSON_SENTINEL = "__invalid__";

/** FormData-safe JSON preprocessor: null/empty → null, valid JSON string → parsed, otherwise sentinel. */
function parseNullableJsonString(value: unknown): unknown {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  if (typeof value !== "string") return INVALID_JSON_SENTINEL;
  try {
    return JSON.parse(value);
  } catch {
    return INVALID_JSON_SENTINEL;
  }
}

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  category_id: z.string().min(1, "La catégorie est requise"),
  brand: z.string().optional().default(""),
  description: z.string().optional().default(""),
  description_type: z.enum(["richtext", "html"]).optional().default("richtext"),
  short_description: z.string().optional().default(""),
  base_price: z.coerce.number().int().min(0, "Le prix doit être positif"),
  compare_price: z.coerce.number().int().min(0).optional(),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(5),
  weight_grams: z.coerce.number().int().min(0).optional(),
  meta_title: z.string().max(60).optional().default(""),
  meta_description: z.string().max(160).optional().default(""),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
  is_featured: z.coerce.number().int().min(0).max(1).default(0),
  tagline: z.preprocess(
    (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
    taglineSchema,
  ),
  highlights: z.preprocess(parseNullableJsonString, highlightsSchema),
  feature_blocks: z.preprocess(parseNullableJsonString, featureBlocksSchema),
  faq: z.preprocess(parseNullableJsonString, faqSchema),
});

/** @deprecated Never called from the UI — product creation now goes through createDraftProduct() + updateProduct(). Scheduled for removal once the draft flow is confirmed stable in production. */
export async function createProduct(formData: FormData): Promise<ActionResult> {
  console.warn("[admin/products] createProduct is deprecated and not called from the UI. Use createDraftProduct + updateProduct.");
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  if (!raw.slug || (raw.slug as string).trim() === "") {
    raw.slug = slugify(raw.name as string);
  }

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;
  const id = nanoid();
  // slug and sku are not in productSchema (server-managed) — read them directly from raw
  const slug = (raw.slug as string | undefined) ?? "";
  const sku = (raw.sku as string | undefined) ?? "";

  // Ensure unique slug — return error like categories for consistency
  const existing = await queryFirst<{ id: string }>(
    "SELECT id FROM products WHERE slug = ?",
    [slug]
  );
  if (existing) {
    return { success: false, error: `Un produit avec le slug "${slug}" existe déjà` };
  }

  try {
    await execute(
      `INSERT INTO products (id, category_id, name, slug, description, short_description, base_price, compare_price, sku, brand, is_active, is_featured, stock_quantity, low_stock_threshold, weight_grams, meta_title, meta_description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        id,
        data.category_id,
        data.name,
        slug,
        data.description || null,
        data.short_description || null,
        data.base_price,
        data.compare_price ?? null,
        sku || null,
        data.brand || null,
        data.is_active,
        data.is_featured,
        data.stock_quantity,
        data.low_stock_threshold,
        data.weight_grams ?? null,
        data.meta_title || null,
        data.meta_description || null,
      ]
    );
  } catch (error) {
    console.error("[admin/products] createProduct error:", error);
    return { success: false, error: "Erreur lors de la création du produit" };
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { success: true, id };
}

export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  const raw = Object.fromEntries(formData);

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
    return { success: false, error: msg };
  }

  const data = parsed.data;

  // Fetch existing product to preserve slug and SKU
  const existing = await queryFirst<{ slug: string; sku: string | null; is_draft: number }>(
    "SELECT slug, sku, is_draft FROM products WHERE id = ?",
    [id]
  );
  if (!existing) {
    console.error("[admin/products] updateProduct: product not found", { id });
    return { success: false, error: "Produit introuvable" };
  }

  // Slug: generate on first save (draft), preserve thereafter
  let finalSlug: string;
  if (existing.is_draft === 1) {
    const base = slugify(data.name);
    if (!base) {
      console.warn("[admin/products] updateProduct: slugify returned empty string", { id, name: data.name });
      return { success: false, error: "Le nom ne permet pas de générer un slug valide" };
    }

    let candidate = base;
    let suffix = 1; // suffix=1 means "try bare slug first"; appended only after first collision → sequence: base, base-2, base-3, … (skips base-1 by convention)
    while (suffix <= 100) {
      const taken = await queryFirst<{ id: string }>(
        "SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1",
        [candidate, id]
      );
      if (!taken) break;
      suffix++;
      candidate = `${base}-${suffix}`;
    }
    if (suffix > 100) {
      console.error("[admin/products] updateProduct: slug exhaustion after 100 attempts", { id, base });
      return { success: false, error: "Impossible de générer un slug unique pour ce nom" };
    }
    finalSlug = candidate;
  } else {
    finalSlug = existing.slug;
  }

  // Sanitize HTML description before storage
  const finalDescription = data.description_type === "html" && data.description
    ? sanitizeDescriptionHtml(data.description, id)
    : data.description || null;

  const updateSql = `UPDATE products SET
     category_id = ?, name = ?, slug = ?, description = ?, description_type = ?, short_description = ?,
     base_price = ?, compare_price = ?, sku = ?, brand = ?,
     is_active = ?, is_featured = ?, stock_quantity = ?,
     low_stock_threshold = ?, weight_grams = ?, meta_title = ?, meta_description = ?,
     tagline = ?, highlights = ?, feature_blocks = ?, faq = ?,
     is_draft = 0, -- Clear draft flag (product becomes live if is_active = 1)
     updated_at = datetime('now')
   WHERE id = ?`;

  const buildParams = (sku: string) => [
    data.category_id,
    data.name,
    finalSlug,
    finalDescription,
    data.description_type,
    data.short_description || null,
    data.base_price,
    data.compare_price ?? null,
    sku,
    data.brand || null,
    data.is_active,
    data.is_featured,
    data.stock_quantity,
    data.low_stock_threshold,
    data.weight_grams ?? null,
    data.meta_title || null,
    data.meta_description || null,
    data.tagline ?? null,
    data.highlights == null ? null : JSON.stringify(data.highlights),
    data.feature_blocks == null ? null : JSON.stringify(data.feature_blocks),
    data.faq == null ? null : JSON.stringify(data.faq),
    id,
  ];

  // SKU: auto-generate when null (covers both draft-flow products and pre-existing rows that predate SKU auto-assignment)
  const existingSku = existing.sku;
  if (existingSku === null) {
    let skuWritten = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const generatedSku = `NET-${nanoid(8).toUpperCase()}`;
      try {
        await execute(updateSql, buildParams(generatedSku));
        skuWritten = true;
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes(DB_CONSTRAINT_SLUG)) {
          console.error("[admin/products] updateProduct: slug race condition on UPDATE", { id, finalSlug });
          return { success: false, error: "Un conflit de slug s'est produit (collision concurrente). Enregistrez à nouveau pour résoudre le conflit." };
        }
        if (!msg.includes(DB_CONSTRAINT_SKU)) {
          console.error("[admin/products] updateProduct: unexpected DB error during SKU generation", { id, attempt }, err);
          throw err;
        }
        // SKU collision — retry
      }
    }
    if (!skuWritten) {
      console.error("[admin/products] updateProduct: SKU generation exhausted after 3 attempts", { id });
      return { success: false, error: "Impossible de générer un SKU unique. Veuillez contacter le support." };
    }
  } else {
    try {
      await execute(updateSql, buildParams(existingSku));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes(DB_CONSTRAINT_SLUG)) {
        console.error("[admin/products] updateProduct: slug race condition on UPDATE", { id, finalSlug });
        return { success: false, error: "Un conflit de slug s'est produit (collision concurrente). Enregistrez à nouveau pour résoudre le conflit." };
      }
      console.error("[admin/products] updateProduct: unexpected DB error on UPDATE", { id }, err);
      throw err;
    }
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}/edit`);
  revalidatePath("/dashboard");
  if (existing.is_draft === 1) {
    revalidatePath("/p/" + finalSlug);
  }
  return { success: true, id };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  // Fetch images to clean up R2 before DB delete
  const images = await query<{ url: string }>(
    "SELECT url FROM product_images WHERE product_id = ?",
    [id]
  );

  // Delete R2 files (best-effort, don't block on failure)
  await Promise.allSettled(
    images.map((img) => {
      const key = img.url.replace(/^\/images\//, "");
      return deleteFromR2(key);
    })
  );

  const { getDB } = await import("@/lib/cloudflare/context");
  const db = await getDB();
  await db.batch([
    db.prepare("DELETE FROM product_images WHERE product_id = ?").bind(id),
    db.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(id),
    db.prepare("DELETE FROM products WHERE id = ?").bind(id),
  ]);

  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleProductActive(id: string): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  await execute(
    "UPDATE products SET is_active = 1 - is_active, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
  revalidatePath("/products");
  return { success: true };
}

export async function toggleProductFeatured(id: string): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  await execute(
    "UPDATE products SET is_featured = 1 - is_featured, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
  revalidatePath("/products");
  return { success: true };
}

/** Create a minimal draft product row so that images and variants can be
 *  uploaded immediately while the admin fills in the rest of the form.
 *  The draft is "published" when the form is saved (is_draft set to 0). */
export async function createDraftProduct(): Promise<ActionResult> {
  await requireAdmin();

  const id = nanoid();
  const slug = `draft-${id}`;

  try {
    await execute(
      `INSERT INTO products (id, category_id, name, slug, base_price, is_active, is_draft, created_at, updated_at)
       VALUES (?, NULL, '', ?, 0, 0, 1, datetime('now'), datetime('now'))`,
      [id, slug]
    );
  } catch (error) {
    console.error("[admin/products] createDraftProduct error:", error);
    return { success: false, error: "Erreur lors de la création du brouillon" };
  }

  return { success: true, id };
}

export async function saveDraftStep(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const idResult = idSchema.safeParse(id);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  const product = await queryFirst<{ slug: string }>(
    "SELECT slug FROM products WHERE id = ? AND is_draft = 1",
    [id],
  );
  if (!product) return { success: false, error: "Produit introuvable" };

  const step = (formData.get("_step") as string) ?? "";
  const raw = Object.fromEntries(formData);
  delete raw._step;

  if (step === "1") {
    const parsed = z
      .object({
        name: z.string().min(1, "Le nom est requis"),
        category_id: z.string().min(1, "La catégorie est requise"),
      })
      .safeParse(raw);
    if (!parsed.success)
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    return applyDraftUpdate(id, parsed.data, product.slug);
  }

  if (step === "2") {
    const raw2 = formData.get("attributes");
    let attrs: { name: string; value: string }[] = [];
    if (raw2 && typeof raw2 === "string") {
      try {
        const parsed = JSON.parse(raw2);
        if (!Array.isArray(parsed)) {
          return { success: false, error: "Format des caractéristiques invalide" };
        }
        attrs = parsed;
      } catch {
        return { success: false, error: "Format des caractéristiques invalide" };
      }
    }
    const valid = attrs.filter(
      (a) => typeof a.name === "string" && a.name.trim() && typeof a.value === "string",
    );
    try {
      await execute("DELETE FROM product_attributes WHERE product_id = ?", [id]);
      for (const attr of valid) {
        await execute(
          "INSERT INTO product_attributes (id, product_id, name, value) VALUES (?, ?, ?, ?)",
          [nanoid(), id, attr.name.trim(), attr.value.trim()],
        );
      }
    } catch (error) {
      console.error(`[admin/products] saveDraftStep attributes failed for id="${id}":`, error);
      return { success: false, error: "Erreur lors de la sauvegarde des caractéristiques" };
    }
    return { success: true };
  }

  if (step === "3") {
    const parsed = z
      .object({
        base_price: z.coerce
          .number()
          .int("Le prix doit être un entier")
          .min(0, "Le prix doit être positif"),
        compare_price: z.coerce.number().int().min(0).optional(),
        stock_quantity: z.coerce.number().int().min(0).default(0),
        low_stock_threshold: z.coerce.number().int().min(0).default(5),
        weight_grams: z.coerce.number().int().min(0).optional(),
      })
      .safeParse(raw);
    if (!parsed.success)
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
      };

    // Handle per-color variants
    const variantsRaw = formData.get("variants") as string | null;
    const uniformPrice = formData.get("uniform_price") === "1";

    const variantEntrySchema = z.array(
      z.object({
        color: z.string().min(1),
        colorName: z.string().min(1),
        stock: z.number().int().min(0),
        price: z.number().int().min(0).nullable(),
      }),
    );

    if (variantsRaw) {
      let variantEntries: z.infer<typeof variantEntrySchema>;
      try {
        const rawParsed = JSON.parse(variantsRaw);
        const validated = variantEntrySchema.safeParse(rawParsed);
        if (!validated.success) {
          return { success: false, error: "Données de variantes invalides" };
        }
        variantEntries = validated.data;
      } catch {
        return { success: false, error: "Format des variantes invalide" };
      }

      // Compute total stock from variants
      const totalStock = variantEntries.reduce((sum, v) => sum + (v.stock ?? 0), 0);
      parsed.data.stock_quantity = totalStock;

      try {
        // Get existing color variants for this product
        const existingVariants = await query<{ id: string; attributes: string }>(
          "SELECT id, attributes FROM product_variants WHERE product_id = ?",
          [id],
        );
        const existingColorMap = new Map<string, string>();
        for (const v of existingVariants) {
          try {
            const attrs = JSON.parse(v.attributes);
            if (attrs.color) {
              existingColorMap.set(attrs.color, v.id);
            }
          } catch (error) {
            console.error(`[admin/products] Malformed attributes JSON for variant id="${v.id}":`, v.attributes, error);
          }
        }

        const processedColorKeys = new Set<string>();

        // Build all statements for atomic batch execution
        const { getDB } = await import("@/lib/cloudflare/context");
        const db = await getDB();
        const statements: ReturnType<typeof db.prepare>[] = [];

        for (const entry of variantEntries) {
          const variantPrice = uniformPrice || entry.price == null
            ? parsed.data.base_price
            : entry.price;
          const variantComparePrice = uniformPrice
            ? (parsed.data.compare_price ?? null)
            : null;
          const attrs = JSON.stringify({ color: entry.color });

          processedColorKeys.add(entry.color);

          const existingId = existingColorMap.get(entry.color);
          if (existingId) {
            statements.push(
              db.prepare(
                `UPDATE product_variants
                 SET name = ?, price = ?, compare_price = ?, stock_quantity = ?, attributes = ?
                 WHERE id = ?`,
              ).bind(entry.colorName, variantPrice, variantComparePrice, entry.stock ?? 0, attrs, existingId),
            );
          } else {
            statements.push(
              db.prepare(
                `INSERT INTO product_variants (id, product_id, name, price, compare_price, stock_quantity, attributes, is_active, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
              ).bind(nanoid(), id, entry.colorName, variantPrice, variantComparePrice, entry.stock ?? 0, attrs, variantEntries.indexOf(entry)),
            );
          }
        }

        // Remove color variants that no longer exist + clear image associations
        for (const [colorKey, variantId] of existingColorMap) {
          if (!processedColorKeys.has(colorKey)) {
            statements.push(
              db.prepare("UPDATE product_images SET variant_id = NULL WHERE variant_id = ?").bind(variantId),
            );
            statements.push(
              db.prepare("DELETE FROM product_variants WHERE id = ?").bind(variantId),
            );
          }
        }

        if (statements.length > 0) {
          await db.batch(statements);
        }
      } catch (error) {
        console.error(`[admin/products] saveDraftStep variants failed for id="${id}":`, error);
        return { success: false, error: "Erreur lors de la sauvegarde des variantes" };
      }
    }

    return applyDraftUpdate(id, parsed.data, product.slug);
  }

  if (step === "4") {
    return { success: true };
  }

  if (step === "5") {
    const parsed = z
      .object({
        short_description: z.string().optional().default(""),
        description: z.string().optional().default(""),
        description_type: z.enum(["richtext", "html"]).optional().default("richtext"),
        meta_title: z
          .string()
          .max(60, "Le titre SEO ne peut pas dépasser 60 caractères")
          .optional()
          .default(""),
        meta_description: z
          .string()
          .max(160, "La méta-description ne peut pas dépasser 160 caractères")
          .optional()
          .default(""),
        is_active: z.coerce.number().int().min(0).max(1).default(0),
        is_featured: z.coerce.number().int().min(0).max(1).default(0),
      })
      .safeParse(raw);
    if (!parsed.success)
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors,
      };

    // Sanitize HTML description before storing draft
    if (parsed.data.description_type === "html" && parsed.data.description) {
      parsed.data.description = sanitizeDescriptionHtml(parsed.data.description, id);
    }

    return applyDraftUpdate(id, parsed.data, product.slug);
  }

  return { success: false, error: "Étape invalide" };
}

async function applyDraftUpdate(
  id: string,
  data: Record<string, unknown>,
  currentSlug: string,
): Promise<ActionResult> {
  const sets: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];

  // Slug auto-derivation: only when name is set and current slug is a draft placeholder
  if ("name" in data && data.name && currentSlug.startsWith("draft-")) {
    const candidateSlug = slugify(data.name as string);
    if (!candidateSlug) {
      return { success: false, error: "Le nom ne peut pas produire un slug valide" };
    }
    const collision = await queryFirst<{ id: string }>(
      "SELECT id FROM products WHERE slug = ? AND id != ?",
      [candidateSlug, id],
    );
    if (collision?.id) {
      return {
        success: false,
        error: `Un produit avec le slug "${candidateSlug}" existe déjà`,
      };
    }
    sets.push("slug = ?");
    values.push(candidateSlug);
  }

  const NULLABLE_FIELDS = new Set([
    "brand",
    "sku",
    "compare_price",
    "weight_grams",
    "short_description",
    "description",
    "meta_title",
    "meta_description",
  ]);

  const ALLOWED_COLUMNS = new Set([
    "name",
    "brand",
    "sku",
    "category_id",
    "base_price",
    "compare_price",
    "stock_quantity",
    "low_stock_threshold",
    "weight_grams",
    "short_description",
    "description",
    "description_type",
    "meta_title",
    "meta_description",
    "is_active",
    "is_featured",
  ]);

  for (const [key, val] of Object.entries(data)) {
    if (!ALLOWED_COLUMNS.has(key)) continue;
    sets.push(`${key} = ?`);
    values.push(
      NULLABLE_FIELDS.has(key) && (val === "" || val == null) ? null : val,
    );
  }

  values.push(id);

  try {
    const result = await execute(
      `UPDATE products SET ${sets.join(", ")} WHERE id = ? AND is_draft = 1`,
      values,
    );
    if (result?.meta?.changes === 0) {
      return { success: false, error: "Ce brouillon n'existe plus ou a déjà été publié" };
    }
  } catch (error) {
    console.error(`[admin/products] applyDraftUpdate failed for id="${id}":`, error);
    return { success: false, error: "Erreur lors de l'enregistrement du brouillon" };
  }

  return { success: true };
}

export async function saveProductAttributes(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const idResult = idSchema.safeParse(productId);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  const attributeSchema = z.array(z.object({
    name: z.string().min(1),
    value: z.string(),
  }));

  const raw = formData.get("attributes");
  let valid: z.infer<typeof attributeSchema> = [];
  if (raw && typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      const result = attributeSchema.safeParse(parsed);
      if (!result.success) {
        return { success: false, error: result.error.issues.map((e) => e.message).join(", ") };
      }
      valid = result.data.filter((a) => a.name.trim());
    } catch (error) {
      console.error(`[admin/products] saveProductAttributes: invalid JSON:`, raw, error);
      return { success: false, error: "Format des caractéristiques invalide" };
    }
  }
  try {
    const { getDB } = await import("@/lib/cloudflare/context");
    const db = await getDB();
    const statements = [
      db.prepare("DELETE FROM product_attributes WHERE product_id = ?").bind(productId),
      ...valid.map((attr) =>
        db.prepare(
          "INSERT INTO product_attributes (id, product_id, name, value) VALUES (?, ?, ?, ?)",
        ).bind(nanoid(), productId, attr.name.trim(), attr.value.trim()),
      ),
    ];
    // If no color attributes remain, clean up orphan color-only variants
    const hasColors = valid.some((a) => a.name.trim() === "Couleur");
    if (!hasColors) {
      const existingVariants = await query<{ id: string; attributes: string }>(
        "SELECT id, attributes FROM product_variants WHERE product_id = ?",
        [productId],
      );
      for (const v of existingVariants) {
        try {
          const attrs = JSON.parse(v.attributes);
          const keys = Object.keys(attrs);
          if (keys.length === 1 && keys[0] === "color") {
            statements.push(
              db.prepare("UPDATE product_images SET variant_id = NULL WHERE variant_id = ?").bind(v.id),
            );
            statements.push(
              db.prepare("DELETE FROM product_variants WHERE id = ?").bind(v.id),
            );
          }
        } catch { /* skip malformed */ }
      }
    }

    await db.batch(statements);
  } catch (error) {
    console.error(`[admin/products] saveProductAttributes failed for id="${productId}":`, error);
    return { success: false, error: "Erreur lors de la sauvegarde des caractéristiques" };
  }
  revalidatePath(`/products/${productId}/edit`);
  return { success: true };
}

export async function saveColorVariants(
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const idResult = idSchema.safeParse(productId);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  const variantEntrySchema = z.array(
    z.object({
      color: z.string().min(1),
      colorName: z.string().min(1),
      stock: z.number().int().min(0),
      price: z.number().int().min(0).nullable(),
    }),
  );

  const variantsRaw = formData.get("variants") as string | null;
  const uniformPrice = formData.get("uniform_price") === "1";
  const basePrice = parseInt(formData.get("base_price") as string) || 0;
  const comparePrice = parseInt(formData.get("compare_price") as string) || null;

  if (!variantsRaw) return { success: true };

  let variantEntries: z.infer<typeof variantEntrySchema>;
  try {
    const rawParsed = JSON.parse(variantsRaw);
    const validated = variantEntrySchema.safeParse(rawParsed);
    if (!validated.success) return { success: false, error: "Données de variantes invalides" };
    variantEntries = validated.data;
  } catch (error) {
    console.error(`[admin/products] saveColorVariants: invalid JSON:`, variantsRaw, error);
    return { success: false, error: "Format des variantes invalide" };
  }

  const totalStock = variantEntries.reduce((sum, v) => sum + v.stock, 0);

  try {
    const existingVariants = await query<{ id: string; attributes: string }>(
      "SELECT id, attributes FROM product_variants WHERE product_id = ?",
      [productId],
    );
    // Only track color-only variants (single "color" key) — skip multi-attribute variants (e.g. color+storage)
    const existingColorMap = new Map<string, string>();
    for (const v of existingVariants) {
      try {
        const attrs = JSON.parse(v.attributes);
        const keys = Object.keys(attrs);
        if (keys.length === 1 && keys[0] === "color" && attrs.color) {
          existingColorMap.set(attrs.color, v.id);
        }
      } catch (error) {
        console.error(`[admin/products] Malformed attributes JSON for variant id="${v.id}":`, v.attributes, error);
      }
    }

    const processedColorKeys = new Set<string>();
    const { getDB } = await import("@/lib/cloudflare/context");
    const db = await getDB();
    const statements: ReturnType<typeof db.prepare>[] = [];

    for (const entry of variantEntries) {
      const variantPrice = (uniformPrice || entry.price == null) ? basePrice : entry.price;
      const variantComparePrice = uniformPrice ? comparePrice : null;
      const attrs = JSON.stringify({ color: entry.color });
      processedColorKeys.add(entry.color);

      const existingId = existingColorMap.get(entry.color);
      if (existingId) {
        statements.push(
          db.prepare(
            `UPDATE product_variants SET name = ?, price = ?, compare_price = ?, stock_quantity = ?, attributes = ? WHERE id = ?`,
          ).bind(entry.colorName, variantPrice, variantComparePrice, entry.stock, attrs, existingId),
        );
      } else {
        statements.push(
          db.prepare(
            `INSERT INTO product_variants (id, product_id, name, price, compare_price, stock_quantity, attributes, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          ).bind(nanoid(), productId, entry.colorName, variantPrice, variantComparePrice, entry.stock, attrs, variantEntries.indexOf(entry)),
        );
      }
    }

    for (const [colorKey, variantId] of existingColorMap) {
      if (!processedColorKeys.has(colorKey)) {
        statements.push(db.prepare("UPDATE product_images SET variant_id = NULL WHERE variant_id = ?").bind(variantId));
        statements.push(db.prepare("DELETE FROM product_variants WHERE id = ?").bind(variantId));
      }
    }

    statements.push(
      db.prepare("UPDATE products SET stock_quantity = ?, updated_at = datetime('now') WHERE id = ?").bind(totalStock, productId),
    );

    if (statements.length > 0) await db.batch(statements);
  } catch (error) {
    console.error(`[admin/products] saveColorVariants failed for id="${productId}":`, error);
    return { success: false, error: "Erreur lors de la sauvegarde des variantes" };
  }

  revalidatePath(`/products/${productId}/edit`);
  return { success: true };
}

/** Delete draft products abandoned for 24+ hours (name still empty).
 *  Also removes associated product_images, product_variants rows and R2 files. */
export async function cleanupDraftProducts(): Promise<void> {
  await requireAdmin();

  const orphanedDrafts = await query<{ id: string }>(
    `SELECT id FROM products
     WHERE is_draft = 1 AND name = ''
     AND created_at < datetime('now', '-24 hours')`
  );

  if (orphanedDrafts.length === 0) return;

  const { getDB } = await import("@/lib/cloudflare/context");
  const db = await getDB();

  for (const draft of orphanedDrafts) {
    try {
      // Clean up R2 files before DB delete (best-effort, matching deleteProduct pattern)
      const images = await query<{ url: string }>(
        "SELECT url FROM product_images WHERE product_id = ?",
        [draft.id]
      );
      await Promise.allSettled(
        images.map((img) => {
          const key = img.url.replace(/^\/images\//, "");
          return deleteFromR2(key);
        })
      );

      await db.batch([
        db.prepare("DELETE FROM product_images WHERE product_id = ?").bind(draft.id),
        db.prepare("DELETE FROM product_variants WHERE product_id = ?").bind(draft.id),
        db.prepare("DELETE FROM products WHERE id = ?").bind(draft.id),
      ]);
    } catch (error) {
      console.error(`[admin/products] Failed to cleanup draft id="${draft.id}":`, error);
    }
  }
}
