import { and, asc, eq, ne, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { nanoid } from "nanoid";
import { getDrizzle, type DrizzleDB } from "@/lib/db/drizzle";
import { auditLog, categories, productAttributes, productImages, productVariants, products } from "@/lib/db/schema";
import type { AuditAction } from "@/lib/db/types";
import { slugify } from "@/lib/utils";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { getImageUrl } from "@/lib/utils/images";
import { deleteFromR2 } from "@/lib/storage/images";
import { fetchAndUploadImage, type FetchImageResult } from "@/lib/ai/image-fetch";
import type {
  AddImagesInput,
  CreateDraftInput,
  DraftAttributesInput,
  SetVariantsInput,
  UpdateDraftInput,
} from "@/lib/validations/mcp-product";

/**
 * Draft-only product persistence for the MCP tools (lib/mcp/tools/products.ts).
 *
 * Invariant: every UPDATE/DELETE on `products` filters on `is_draft = 1`. A
 * published product is unreachable from here by construction — that is the
 * mechanical form of the "drafts only" decision in the spec.
 *
 * Invariant: every write takes a `DraftAudit` and commits its `audit_log` row
 * in the same `db.batch()` as the mutation (D1 batches are transactional), so
 * a product change can never land without its actor/client attribution.
 */

export type DraftErrorCode = "not_found" | "conflict" | "limit_exceeded";

export class DraftError extends Error {
  constructor(public readonly code: DraftErrorCode, message: string) {
    super(message);
    this.name = "DraftError";
  }
}

export const MAX_IMAGES_PER_PRODUCT = 12;

/** Who performs the write and how (e.g. `{ via: "mcp", tool, client_id }`). */
export interface DraftAudit {
  actor: { id: string; name: string };
  details: Record<string, unknown>;
}

type Statement = BatchItem<"sqlite">;
type Batch = [Statement, ...Statement[]];

// ─── Pure helpers ───

const DIMENSION_LABELS: Array<[keyof DraftAttributesInput["dimensions"], string]> = [
  ["length_mm", "Longueur"],
  ["height_mm", "Hauteur"],
  ["width_mm", "Largeur"],
  ["weight_g", "Poids"],
];

/** Same encoding as the wizard's step 2 and products-ai.ts. */
export function attributesToRows(attrs: DraftAttributesInput | undefined): { name: string; value: string }[] {
  if (!attrs) return [];
  const rows: { name: string; value: string }[] = [];
  for (const c of attrs.colors) rows.push({ name: "Couleur", value: `${c.name}|${c.hex}` });
  for (const [key, label] of DIMENSION_LABELS) {
    const v = attrs.dimensions[key];
    if (v != null) rows.push({ name: label, value: String(v) });
  }
  for (const s of attrs.specs) rows.push({ name: s.name, value: s.value });
  return rows;
}

type ProductColumns = Partial<typeof products.$inferInsert>;

/** Only keys the caller provided end up in the statement; `null` clears. */
function buildProductColumns(input: UpdateDraftInput, productId: string): ProductColumns {
  const cols: ProductColumns = {};
  if (input.name !== undefined) cols.name = input.name;
  if (input.category_id !== undefined) cols.category_id = input.category_id;
  if (input.brand !== undefined) cols.brand = input.brand;
  if (input.short_description !== undefined) cols.short_description = input.short_description;
  if (input.description_html !== undefined) {
    cols.description = input.description_html ? sanitizeDescriptionHtml(input.description_html, productId) : null;
    cols.description_type = "html";
  }
  if (input.seo) {
    if (input.seo.meta_title !== undefined) cols.meta_title = input.seo.meta_title;
    if (input.seo.meta_description !== undefined) cols.meta_description = input.seo.meta_description;
  }
  if (input.story) {
    const s = input.story;
    if (s.tagline !== undefined) cols.tagline = s.tagline;
    if (s.highlights !== undefined) cols.highlights = s.highlights ? JSON.stringify(s.highlights) : null;
    if (s.feature_blocks !== undefined) cols.feature_blocks = s.feature_blocks ? JSON.stringify(s.feature_blocks) : null;
    if (s.faq !== undefined) cols.faq = s.faq ? JSON.stringify(s.faq) : null;
  }
  if (input.pricing) {
    const p = input.pricing;
    if (p.base_price !== undefined) cols.base_price = p.base_price;
    if (p.compare_price !== undefined) cols.compare_price = p.compare_price;
    if (p.sku !== undefined) cols.sku = p.sku;
    if (p.stock_quantity !== undefined) cols.stock_quantity = p.stock_quantity;
    if (p.low_stock_threshold !== undefined) cols.low_stock_threshold = p.low_stock_threshold;
    if (p.weight_grams !== undefined) cols.weight_grams = p.weight_grams;
  }
  return cols;
}

function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function r2KeyFromImageUrl(url: string): string {
  return url.replace(/^\/images\//, "");
}

// ─── Audit ───

/** `audit_log` row for `productId`, to be appended to the write's batch. */
function auditStatement(db: DrizzleDB, audit: DraftAudit, action: AuditAction, productId: string): Statement {
  return db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actor_id: audit.actor.id,
    actor_name: audit.actor.name,
    action,
    target_type: "product",
    target_id: productId,
    details: JSON.stringify(audit.details),
  });
}

// ─── DB probes ───

async function requireDraft(db: DrizzleDB, id: string): Promise<{ id: string; slug: string }> {
  const row = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(and(eq(products.id, id), eq(products.is_draft, 1)))
    .limit(1)
    .get();
  if (!row) throw new DraftError("not_found", "Brouillon introuvable (ou produit déjà publié)");
  return row;
}

async function requireCategory(db: DrizzleDB, categoryId: string): Promise<void> {
  const row = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.is_active, 1)))
    .limit(1)
    .get();
  if (!row) throw new DraftError("not_found", "Catégorie introuvable");
}

async function requireSkuFree(db: DrizzleDB, sku: string, excludeId: string | null): Promise<void> {
  const cond = excludeId ? and(eq(products.sku, sku), ne(products.id, excludeId)) : eq(products.sku, sku);
  const row = await db.select({ id: products.id }).from(products).where(cond).limit(1).get();
  if (row) throw new DraftError("conflict", `Le SKU "${sku}" est déjà utilisé`);
}

async function isSlugTaken(db: DrizzleDB, slug: string, excludeId: string): Promise<boolean> {
  const row = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.slug, slug), ne(products.id, excludeId)))
    .limit(1)
    .get();
  return Boolean(row);
}

/** `base`, then `base-2` … `base-20`; null when everything collides (caller uses a placeholder). */
async function ensureUniqueSlug(db: DrizzleDB, base: string, excludeId: string): Promise<string | null> {
  if (!base) return null;
  let candidate = base;
  for (let suffix = 1; suffix <= 20; suffix++) {
    if (!(await isSlugTaken(db, candidate, excludeId))) return candidate;
    candidate = `${base}-${suffix + 1}`;
  }
  return null;
}

// ─── Create / update / read / search / delete ───

export async function createDraft(input: CreateDraftInput, audit: DraftAudit): Promise<{ id: string; slug: string }> {
  const db = await getDrizzle();
  await requireCategory(db, input.category_id);
  if (input.pricing?.sku) await requireSkuFree(db, input.pricing.sku, null);

  const id = nanoid();
  const slug = (await ensureUniqueSlug(db, slugify(input.name), id)) ?? `draft-${id}`;
  const cols = buildProductColumns(input, id);

  const stmts: Batch = [
    db.insert(products).values({
      ...cols,
      id,
      name: input.name,
      category_id: input.category_id,
      slug,
      base_price: cols.base_price ?? 0,
      is_active: 0,
      is_draft: 1,
      created_at: sql`datetime('now')`,
      updated_at: sql`datetime('now')`,
    }),
  ];
  for (const row of attributesToRows(input.attributes)) {
    stmts.push(db.insert(productAttributes).values({ id: nanoid(), product_id: id, ...row }));
  }
  stmts.push(auditStatement(db, audit, "product.draft_created", id));
  await db.batch(stmts);
  return { id, slug };
}

/**
 * `patch.attributes`, when present, replaces the whole attribute set — the
 * schema requires all three groups so nothing is dropped by omission.
 */
export async function updateDraft(id: string, patch: UpdateDraftInput, audit: DraftAudit): Promise<{ id: string; slug: string }> {
  const db = await getDrizzle();
  const current = await requireDraft(db, id);
  if (patch.category_id !== undefined) await requireCategory(db, patch.category_id);
  if (patch.pricing?.sku) await requireSkuFree(db, patch.pricing.sku, id);

  let slug = current.slug;
  if (patch.slug !== undefined) {
    if (await isSlugTaken(db, patch.slug, id)) throw new DraftError("conflict", `Le slug "${patch.slug}" est déjà utilisé`);
    slug = patch.slug;
  }

  const stmts: Batch = [
    db
      .update(products)
      .set({ ...buildProductColumns(patch, id), slug, updated_at: sql`datetime('now')` })
      .where(and(eq(products.id, id), eq(products.is_draft, 1))),
  ];
  if (patch.attributes !== undefined) {
    stmts.push(db.delete(productAttributes).where(eq(productAttributes.product_id, id)));
    for (const row of attributesToRows(patch.attributes)) {
      stmts.push(db.insert(productAttributes).values({ id: nanoid(), product_id: id, ...row }));
    }
  }
  stmts.push(auditStatement(db, audit, "product.draft_updated", id));
  await db.batch(stmts);
  return { id, slug };
}

export interface DraftDetail {
  id: string;
  name: string;
  slug: string;
  edit_url: string;
  category_id: string | null;
  brand: string | null;
  short_description: string | null;
  description_html: string | null;
  base_price: number;
  compare_price: number | null;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  weight_grams: number | null;
  seo: { meta_title: string | null; meta_description: string | null };
  story: { tagline: string | null; highlights: unknown; feature_blocks: unknown; faq: unknown };
  attributes: { id: string; name: string; value: string }[];
  images: { id: string; url: string; alt: string | null; is_primary: boolean; sort_order: number; variant_id: string | null }[];
  variants: { id: string; name: string; price: number; compare_price: number | null; stock_quantity: number; attributes: unknown }[];
  created_at: string;
  updated_at: string;
}

function parseJson(v: string | null): unknown {
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}

export async function getDraft(id: string): Promise<DraftDetail> {
  const db = await getDrizzle();
  const p = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.is_draft, 1)))
    .limit(1)
    .get();
  if (!p) throw new DraftError("not_found", "Brouillon introuvable (ou produit déjà publié)");

  const [attrs, imgs, vars] = await Promise.all([
    db.select({ id: productAttributes.id, name: productAttributes.name, value: productAttributes.value })
      .from(productAttributes).where(eq(productAttributes.product_id, id)).all(),
    db.select({
      id: productImages.id, url: productImages.url, alt: productImages.alt,
      is_primary: productImages.is_primary, sort_order: productImages.sort_order, variant_id: productImages.variant_id,
    }).from(productImages).where(eq(productImages.product_id, id)).orderBy(asc(productImages.sort_order)).all(),
    db.select({
      id: productVariants.id, name: productVariants.name, price: productVariants.price,
      compare_price: productVariants.compare_price, stock_quantity: productVariants.stock_quantity, attributes: productVariants.attributes,
    }).from(productVariants).where(eq(productVariants.product_id, id)).orderBy(asc(productVariants.sort_order)).all(),
  ]);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    edit_url: `/products/${p.id}/edit`,
    category_id: p.category_id,
    brand: p.brand,
    short_description: p.short_description,
    description_html: p.description,
    base_price: p.base_price,
    compare_price: p.compare_price,
    sku: p.sku,
    stock_quantity: p.stock_quantity,
    low_stock_threshold: p.low_stock_threshold,
    weight_grams: p.weight_grams,
    seo: { meta_title: p.meta_title, meta_description: p.meta_description },
    story: {
      tagline: p.tagline,
      highlights: parseJson(p.highlights),
      feature_blocks: parseJson(p.feature_blocks),
      faq: parseJson(p.faq),
    },
    attributes: attrs,
    images: imgs.map((i) => ({ ...i, url: getImageUrl(i.url), is_primary: i.is_primary === 1 })),
    variants: vars.map((v) => ({ ...v, attributes: parseJson(v.attributes) })),
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

export interface ProductSearchRow {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  sku: string | null;
  base_price: number;
  is_draft: boolean;
  is_active: boolean;
}

/** Drafts and published products alike: this is the duplicate detector. */
export async function searchProducts(query: string, limit: number): Promise<ProductSearchRow[]> {
  const db = await getDrizzle();
  const pattern = `%${escapeLike(query)}%`;
  const rows = await db
    .select({
      id: products.id, name: products.name, slug: products.slug, brand: products.brand,
      sku: products.sku, base_price: products.base_price, is_draft: products.is_draft, is_active: products.is_active,
    })
    .from(products)
    .where(or(
      sql`${products.name} like ${pattern} escape '\\'`,
      sql`${products.slug} like ${pattern} escape '\\'`,
      sql`${products.sku} like ${pattern} escape '\\'`,
    ))
    .orderBy(asc(products.name))
    .limit(limit)
    .all();
  return rows.map((r) => ({ ...r, is_draft: r.is_draft === 1, is_active: r.is_active === 1 }));
}

export async function deleteDraft(id: string, audit: DraftAudit): Promise<void> {
  const db = await getDrizzle();
  await requireDraft(db, id);
  const imgs = await db.select({ url: productImages.url }).from(productImages).where(eq(productImages.product_id, id)).all();

  // Children explicitly, like actions/admin/products.ts deleteProduct — do not
  // rely on FK cascade being enabled on the D1 connection.
  await db.batch([
    db.delete(productImages).where(eq(productImages.product_id, id)),
    db.delete(productVariants).where(eq(productVariants.product_id, id)),
    db.delete(productAttributes).where(eq(productAttributes.product_id, id)),
    db.delete(products).where(and(eq(products.id, id), eq(products.is_draft, 1))),
    auditStatement(db, audit, "product.draft_deleted", id),
  ]);

  const cleanup = await Promise.allSettled(imgs.map((i) => deleteFromR2(r2KeyFromImageUrl(i.url))));
  for (const c of cleanup) {
    if (c.status === "rejected") console.warn("[product-drafts] orphan R2 object after deleteDraft", id, c.reason);
  }
}

// ─── Images ───

export interface ImageImportResult {
  url: string;
  ok: boolean;
  image_id?: string;
  reason?: ImageImportFailure;
}

type FetchSuccess = Extract<FetchImageResult, { ok: true }>;

export type ImageImportFailure = Extract<FetchImageResult, { ok: false }>["reason"] | "limit_exceeded";

/**
 * One `product_images` row, with `is_primary`, `sort_order` and the
 * per-product limit all resolved inside the statement. Statements of one
 * `db.batch()` run in a single transaction and each sees the rows the previous
 * ones inserted, so two concurrent calls cannot both take "primary", reuse a
 * `sort_order`, or push the product past MAX_IMAGES_PER_PRODUCT — the second
 * one's INSERT simply selects no row. Selecting from the draft's own
 * `products` row (not `select 1`) also re-checks `is_draft = 1` at commit time.
 *
 * `insert().select()` because a raw `db.run(sql)` is not batchable on D1.
 * Drizzle requires every column of the table, in schema order.
 */
function insertImageStatement(
  db: DrizzleDB,
  productId: string,
  row: { id: string; key: string; alt: string | null },
): Statement {
  const ofProduct = sql`${productImages.product_id} = ${productId}`;
  return db.insert(productImages).select(
    db
      .select({
        id: sql<string>`${row.id}`.as("id"),
        product_id: sql<string>`${productId}`.as("product_id"),
        variant_id: sql<null>`null`.as("variant_id"),
        url: sql<string>`${row.key}`.as("url"),
        alt: sql<string | null>`${row.alt}`.as("alt"),
        sort_order: sql<number>`coalesce((select max(${productImages.sort_order}) + 1 from ${productImages} where ${ofProduct}), 0)`.as("sort_order"),
        is_primary: sql<number>`case when exists (select 1 from ${productImages} where ${ofProduct} and ${productImages.is_primary} = 1) then 0 else 1 end`.as("is_primary"),
        created_at: sql<string>`datetime('now')`.as("created_at"),
      })
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.is_draft, 1),
        sql`(select count(*) from ${productImages} where ${ofProduct}) < ${MAX_IMAGES_PER_PRODUCT}`,
      )),
  );
}

/** Audit row committed only if at least one of `imageIds` made it past the limit guard. */
function imagesAuditStatement(db: DrizzleDB, audit: DraftAudit, productId: string, imageIds: string[]): Statement {
  const action: AuditAction = "product.draft_updated";
  return db.insert(auditLog).select(
    db
      .select({
        id: sql<string>`${crypto.randomUUID()}`.as("id"),
        actor_id: sql<string>`${audit.actor.id}`.as("actor_id"),
        actor_name: sql<string>`${audit.actor.name}`.as("actor_name"),
        action: sql<string>`${action}`.as("action"),
        target_type: sql<string>`${"product"}`.as("target_type"),
        target_id: sql<string>`${productId}`.as("target_id"),
        details: sql<string>`${JSON.stringify(audit.details)}`.as("details"),
        created_at: sql<string>`datetime('now')`.as("created_at"),
      })
      .from(products)
      .where(and(
        eq(products.id, productId),
        sql`exists (select 1 from ${productImages} where ${productImages.id} in (${sql.join(imageIds.map((i) => sql`${i}`), sql`, `)}))`,
      )),
  );
}

async function cleanupR2(keys: string[], context: string): Promise<void> {
  const cleanup = await Promise.allSettled(keys.map((k) => deleteFromR2(k)));
  cleanup.forEach((c, i) => {
    if (c.status === "rejected") console.warn(`[product-drafts] orphan R2 object after ${context}`, keys[i], c.reason);
  });
}

export async function addImagesFromUrls(
  id: string,
  images: AddImagesInput["images"],
  audit: DraftAudit,
): Promise<{ results: ImageImportResult[]; primary_image_id: string | null }> {
  const db = await getDrizzle();
  await requireDraft(db, id);

  // Early refusal so an obviously over-limit call fails before any download.
  // Not authoritative: the WHERE guard of insertImageStatement is.
  const counted = await db
    .select({ count: sql<number>`count(*)` })
    .from(productImages)
    .where(eq(productImages.product_id, id))
    .get();
  const existingCount = counted?.count ?? 0;
  if (existingCount + images.length > MAX_IMAGES_PER_PRODUCT) {
    throw new DraftError(
      "limit_exceeded",
      `Au plus ${MAX_IMAGES_PER_PRODUCT} images par produit (${existingCount} déjà présentes)`,
    );
  }

  // One record per input entry, id generated up front so the same URL sent
  // twice is still reconciled entry by entry (rows, audit, read-back, R2).
  type Entry = { img: AddImagesInput["images"][number] } & (
    | { r: FetchSuccess; imageId: string }
    | { r: Exclude<FetchImageResult, { ok: true }>; imageId: null }
  );
  const fetched: Entry[] = await Promise.all(
    images.map(async (img): Promise<Entry> => {
      const r = await fetchAndUploadImage(id, img.url);
      return r.ok ? { img, r, imageId: nanoid() } : { img, r, imageId: null };
    }),
  );
  const succeeded = fetched.filter((x): x is Extract<Entry, { imageId: string }> => x.imageId !== null);

  const stmts: Statement[] = succeeded.map(({ img, r, imageId }) =>
    insertImageStatement(db, id, { id: imageId, key: r.key, alt: img.alt ?? null }),
  );

  if (stmts.length > 0) {
    stmts.push(imagesAuditStatement(db, audit, id, succeeded.map((x) => x.imageId)));
    try {
      await db.batch(stmts as Batch);
    } catch (err) {
      console.error("[product-drafts] image batch failed, cleaning R2", { id }, err);
      await cleanupR2(succeeded.map(({ r }) => r.key), "failed image batch");
      throw err;
    }
  }

  // Read back what the transaction actually kept: the primary is decided in
  // SQL, and an insert the limit guard skipped leaves no row behind.
  const rows = await db
    .select({ id: productImages.id, is_primary: productImages.is_primary })
    .from(productImages)
    .where(eq(productImages.product_id, id))
    .all();
  const landed = new Set(rows.map((r) => r.id));
  const primaryId = rows.find((r) => r.is_primary === 1)?.id ?? null;

  const skipped = succeeded.filter(({ imageId }) => !landed.has(imageId));
  if (skipped.length > 0) await cleanupR2(skipped.map(({ r }) => r.key), "limit_exceeded");

  const results: ImageImportResult[] = fetched.map((e) => {
    if (e.imageId === null) return { url: e.img.url, ok: false, reason: e.r.reason };
    return landed.has(e.imageId)
      ? { url: e.img.url, ok: true, image_id: e.imageId }
      : { url: e.img.url, ok: false, reason: "limit_exceeded" };
  });
  if (results.some((x) => !x.ok)) {
    console.error("[product-drafts] image import failures", { id }, results.filter((x) => !x.ok));
  }
  return { results, primary_image_id: primaryId };
}

export async function removeImage(id: string, imageId: string, audit: DraftAudit): Promise<void> {
  const db = await getDrizzle();
  await requireDraft(db, id);

  const img = await db
    .select({ id: productImages.id, url: productImages.url, is_primary: productImages.is_primary })
    .from(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.product_id, id)))
    .limit(1)
    .get();
  if (!img) throw new DraftError("not_found", "Image introuvable sur ce brouillon");

  const stmts: Batch = [db.delete(productImages).where(eq(productImages.id, imageId))];
  if (img.is_primary === 1) {
    const next = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(and(eq(productImages.product_id, id), ne(productImages.id, imageId)))
      .orderBy(asc(productImages.sort_order))
      .limit(1)
      .get();
    if (next) stmts.push(db.update(productImages).set({ is_primary: 1 }).where(eq(productImages.id, next.id)));
  }
  stmts.push(auditStatement(db, audit, "product.draft_updated", id));
  await db.batch(stmts);

  await deleteFromR2(r2KeyFromImageUrl(img.url)).catch((e) => {
    console.warn("[product-drafts] orphan R2 object after removeImage", img.url, e);
  });
}

// ─── Colour variants ───

export interface VariantRow {
  id: string;
  color_name: string;
  color_hex: string;
  price: number;
  stock: number;
}

/** Wizard convention (step-pricing.tsx): `{ color: "<name>:<#hex>" }`. */
function colorKey(name: string, hex: string): string {
  return `${name}:${hex}`;
}

/** Port of actions/admin/products.ts saveColorVariants, Drizzle + draft-only. */
export async function setColorVariants(
  id: string,
  input: SetVariantsInput,
  audit: DraftAudit,
): Promise<{ variants: VariantRow[]; stock_quantity: number }> {
  const db = await getDrizzle();
  const product = await db
    .select({ id: products.id, slug: products.slug, base_price: products.base_price, compare_price: products.compare_price })
    .from(products)
    .where(and(eq(products.id, id), eq(products.is_draft, 1)))
    .limit(1)
    .get();
  if (!product) throw new DraftError("not_found", "Brouillon introuvable (ou produit déjà publié)");

  const existing = await db
    .select({ id: productVariants.id, attributes: productVariants.attributes })
    .from(productVariants)
    .where(eq(productVariants.product_id, id))
    .all();

  // Only colour-only variants (single "color" key) are managed here.
  const existingByColor = new Map<string, string>();
  for (const v of existing) {
    try {
      const attrs = JSON.parse(v.attributes) as Record<string, unknown>;
      const keys = Object.keys(attrs);
      if (keys.length === 1 && keys[0] === "color" && typeof attrs.color === "string") existingByColor.set(attrs.color, v.id);
    } catch (e) {
      console.error("[product-drafts] malformed variant attributes", v.id, e);
    }
  }

  const stmts: Statement[] = [];
  const out: VariantRow[] = [];
  const seen = new Set<string>();
  let total = 0;

  input.variants.forEach((entry, index) => {
    const key = colorKey(entry.color_name, entry.color_hex);
    seen.add(key);
    const price = input.uniform_price || entry.price == null ? product.base_price : entry.price;
    const comparePrice = input.uniform_price ? product.compare_price : null;
    const attrs = JSON.stringify({ color: key });
    total += entry.stock;

    const existingId = existingByColor.get(key);
    const variantId = existingId ?? nanoid();
    if (existingId) {
      stmts.push(
        db.update(productVariants)
          .set({ name: entry.color_name, price, compare_price: comparePrice, stock_quantity: entry.stock, attributes: attrs })
          .where(eq(productVariants.id, existingId)),
      );
    } else {
      stmts.push(
        db.insert(productVariants).values({
          id: variantId, product_id: id, name: entry.color_name, price, compare_price: comparePrice,
          stock_quantity: entry.stock, attributes: attrs, is_active: 1, sort_order: index,
          created_at: sql`datetime('now')`,
        }),
      );
    }
    out.push({ id: variantId, color_name: entry.color_name, color_hex: entry.color_hex, price, stock: entry.stock });
  });

  for (const [key, variantId] of existingByColor) {
    if (seen.has(key)) continue;
    stmts.push(db.update(productImages).set({ variant_id: null }).where(eq(productImages.variant_id, variantId)));
    stmts.push(db.delete(productVariants).where(eq(productVariants.id, variantId)));
  }

  stmts.push(
    db.update(products)
      .set({ stock_quantity: total, updated_at: sql`datetime('now')` })
      .where(and(eq(products.id, id), eq(products.is_draft, 1))),
  );
  stmts.push(auditStatement(db, audit, "product.draft_updated", id));

  await db.batch(stmts as Batch);
  return { variants: out, stock_quantity: total };
}
