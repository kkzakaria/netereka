import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { nanoid } from "nanoid";
import { getDrizzle, type DrizzleDB } from "@/lib/db/drizzle";
import { auditLog, banners, contentRevisions, productImages, productVariants, products } from "@/lib/db/schema";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { deleteFromR2 } from "@/lib/storage/images";
import { MAX_IMAGES_PER_PRODUCT, r2KeyFromImageUrl } from "@/lib/db/product-drafts";
import type { AuditAction } from "@/lib/db/types";

/**
 * Dépôt, lecture et application des révisions (`content_revisions`) pour le
 * MCP et la surface conversationnelle. Suit les conventions de
 * `lib/db/product-drafts.ts` : Drizzle, erreurs typées, audit dans le même
 * `db.batch()` que la mutation.
 */

export type RevisionTarget = "product" | "banner";
/**
 * `update`/`publish` : phase 1, colonnes de `products`/`banners` (voir
 * `PRODUCT_WRITABLE_COLUMNS`/`BANNER_WRITABLE_COLUMNS` ci-dessous).
 * `add_images`/`remove_image`/`set_variants` : phase 2 — même modèle de
 * révision, mais la cible d'écriture est une table enfant du produit
 * (`product_images`, `product_variants`), jamais une colonne de `products`
 * elle-même. Uniquement pour `target: "product"` : une bannière n'a ni
 * images ni variantes.
 */
export type RevisionKind = "update" | "publish" | "add_images" | "remove_image" | "set_variants";
export type RevisionOrigin = "mcp" | "admin_chat";
export type RevisionStatus = "pending" | "applied" | "rejected" | "superseded";

export class RevisionError extends Error {
  constructor(
    public code: "not_found" | "conflict" | "validation_error",
    message: string,
  ) {
    super(message);
    this.name = "RevisionError";
  }
}

export interface RevisionActor {
  id: string;
  name: string;
}

type Statement = BatchItem<"sqlite">;
type Batch = [Statement, ...Statement[]];

/**
 * Les colonnes d'un produit qui portent du HTML libre et doivent donc être
 * assainies avec la portée de la ligne. Toute colonne ajoutée ici plus tard
 * DOIT l'être aussi dans la table équivalente des bannières si elle s'y
 * applique — une surface assainie d'un côté et pas de l'autre est le défaut
 * qui a coûté trois revues au lot A.
 */
// Exportées : l'écran de validation (components/admin/revision-diff.tsx) en a
// besoin pour distinguer, dans un payload, les colonnes de HTML libre (rendues
// côte à côte, avec la classe de portée) des colonnes simples (affichées en
// texte). Une seconde liste maintenue à la main dans le composant serait la
// même dérive qu'une seconde façon d'écrire `scopeFor`.
export const PRODUCT_HTML_COLUMNS = ["description", "faq_html"] as const;
export const BANNER_HTML_COLUMNS = ["content_html"] as const;

/** La portée d'assainissement d'une cible. Un produit : son id nu. Une
 *  bannière : `banner-<id>`, parce que le hero rend dans `desc-banner-<id>`. */
export function scopeFor(target: RevisionTarget, id: string): string {
  return target === "banner" ? `banner-${id}` : id;
}

/**
 * Colonnes qu'une révision a le droit de proposer, par cible — une liste
 * BLANCHE, pas une liste noire : une colonne future sur `products` ou
 * `banners` n'est écrivable par une révision qu'après avoir été ajoutée ici
 * explicitement. L'inverse (tout sauf quelques colonnes interdites) laisse
 * passer, par défaut, toute colonne simplement oubliée de la liste noire.
 *
 * Exclut délibérément, pour `products` :
 * - `id`, `slug` — les réécrire détacherait instantanément tout CSS scopé
 *   déjà stocké sous l'ancien identifiant (`.desc-<ancien-id>`), la même
 *   classe de défaut que `scopeFor` existe pour éviter ailleurs.
 * - `is_draft` — § 2.3 du spec : « la dépublication n'est pas exposée du
 *   tout », parce qu'un retrait passe inaperçu alors qu'une mise en ligne
 *   ratée se voit. `applyRevision` reste seul à le poser, et seulement pour
 *   `kind: "publish"`.
 * - `created_at`, `updated_at` — `updated_at` est géré par `applyRevision`
 *   lui-même : c'est l'horodatage de l'écriture ET la clé du contrôle de
 *   version (`base_version`), une révision ne doit donc jamais pouvoir le
 *   dicter.
 *
 * Rien n'atteint ce contrôle aujourd'hui (aucun outil ne dépose encore de
 * révision), mais `createRevision` est l'interface que les cinq outils
 * généralisés de la phase 2 vont tous consommer : la garantie doit tenir au
 * dépôt, pas dépendre de ce que chaque appelant pense à vérifier lui-même —
 * même principe que `sanitizePayload` ci-dessus.
 */
const PRODUCT_WRITABLE_COLUMNS = new Set([
  "category_id",
  "name",
  "description",
  "description_type",
  "short_description",
  "base_price",
  "compare_price",
  "sku",
  "brand",
  "is_active",
  "is_featured",
  "stock_quantity",
  "low_stock_threshold",
  "weight_grams",
  "meta_title",
  "meta_description",
  "tagline",
  "highlights",
  "feature_blocks",
  "faq",
  "faq_html",
]);

/** Pas d'`id`/`created_at`/`updated_at` — mêmes raisons que pour les
 *  produits. Les bannières n'ont ni `slug` ni `is_draft`. */
const BANNER_WRITABLE_COLUMNS = new Set([
  "title",
  "subtitle",
  "badge_text",
  "badge_color",
  "image_url",
  "link_url",
  "cta_text",
  "price",
  "bg_gradient_from",
  "bg_gradient_to",
  "content_html",
  "display_order",
  "is_active",
  "starts_at",
  "ends_at",
]);

function writableColumnsFor(target: RevisionTarget): Set<string> {
  return target === "banner" ? BANNER_WRITABLE_COLUMNS : PRODUCT_WRITABLE_COLUMNS;
}

/**
 * Refuse, AU DÉPÔT, un payload qui contiendrait une colonne hors liste
 * blanche — jamais à l'application, pour la même raison que
 * `sanitizePayload` assainit au dépôt plutôt qu'à la lecture : la garantie
 * ne doit pas dépendre du moment ni de l'appelant.
 */
function assertWritablePayload(target: RevisionTarget, payload: Record<string, unknown>): void {
  const allowed = writableColumnsFor(target);
  const rejected = Object.keys(payload).filter((key) => !allowed.has(key));
  if (rejected.length > 0) {
    throw new RevisionError(
      "validation_error",
      `Colonne(s) non autorisée(s) dans une révision : ${rejected.join(", ")}.`,
    );
  }
}

/**
 * Valide la FORME du payload selon la nature de la révision — au dépôt
 * (`createRevision`) et re-vérifié à l'application (`applyRevision`), même
 * principe qu'`assertWritablePayload` : la garantie ne doit dépendre ni du
 * moment ni de l'appelant.
 *
 * `update`/`publish` gardent le contrôle historique par liste blanche de
 * colonnes de `products`/`banners`. Les trois natures ajoutées par la
 * généralisation des outils (`add_images`, `remove_image`, `set_variants`)
 * n'écrivent AUCUNE colonne de `products` : leur payload porte la forme
 * qu'attend le bâtisseur de statements correspondant (voir plus bas), pas
 * une colonne, donc `assertWritablePayload` ne leur convient pas — et elles
 * ne s'appliquent qu'à un produit, jamais à une bannière.
 */
function assertValidPayload(target: RevisionTarget, kind: RevisionKind, payload: Record<string, unknown>): void {
  if (kind === "update" || kind === "publish") {
    assertWritablePayload(target, payload);
    return;
  }
  if (target !== "product") {
    throw new RevisionError("validation_error", `Une révision "${kind}" ne s'applique qu'à un produit.`);
  }
  if (kind === "add_images") {
    const images = (payload as { images?: unknown }).images;
    if (!Array.isArray(images) || images.length === 0) {
      throw new RevisionError("validation_error", "Le payload add_images doit porter un tableau images non vide.");
    }
    for (const img of images) {
      const key = (img as { key?: unknown } | null)?.key;
      if (typeof key !== "string" || key.length === 0) {
        throw new RevisionError("validation_error", "Chaque image doit porter une clé R2 (key) non vide.");
      }
    }
    return;
  }
  if (kind === "remove_image") {
    const imageId = (payload as { image_id?: unknown }).image_id;
    if (typeof imageId !== "string" || imageId.length === 0) {
      throw new RevisionError("validation_error", "Le payload remove_image doit porter image_id.");
    }
    return;
  }
  if (kind === "set_variants") {
    const variants = (payload as { variants?: unknown }).variants;
    if (!Array.isArray(variants)) {
      throw new RevisionError("validation_error", "Le payload set_variants doit porter un tableau variants.");
    }
  }
}

/**
 * Jumeau de `insertImageStatement` (lib/db/product-drafts.ts), sans le
 * filtre `is_draft = 1` : la cible d'une révision `add_images` est par
 * construction un produit PUBLIÉ (`writePath`, lib/mcp/tools/products.ts) —
 * un brouillon écrit directement et ne passe jamais par ici. Même calcul SQL
 * de `sort_order`/`is_primary` et même garde du plafond d'images, pour que
 * les deux chemins ne divergent jamais sur la même règle.
 */
function insertRevisionImageStatement(
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
        sql`(select count(*) from ${productImages} where ${ofProduct}) < ${MAX_IMAGES_PER_PRODUCT}`,
      )),
  );
}

/**
 * Jumeau de `removeImage` (lib/db/product-drafts.ts), sans le filtre
 * `is_draft = 1`. Renvoie aussi l'URL (= clé R2 nue, voir
 * `r2KeyFromImageUrl`) de l'image supprimée : le fichier R2 n'est effacé
 * qu'APRÈS le commit du batch — voir l'appelant, `applyRevision` — jamais
 * avant, pour ne jamais laisser une ligne supprimée pointer vers un fichier
 * qui, lui, a survécu à un batch qui aurait échoué.
 */
async function buildRemoveImageStatements(
  db: DrizzleDB,
  productId: string,
  imageId: string,
): Promise<{ stmts: Statement[]; removedUrl: string }> {
  const img = await db
    .select({ id: productImages.id, url: productImages.url, is_primary: productImages.is_primary })
    .from(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.product_id, productId)))
    .limit(1)
    .get();
  if (!img) throw new RevisionError("not_found", "Image introuvable sur ce produit.");

  const stmts: Statement[] = [db.delete(productImages).where(eq(productImages.id, imageId))];
  if (img.is_primary === 1) {
    const next = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(and(eq(productImages.product_id, productId), ne(productImages.id, imageId)))
      .orderBy(asc(productImages.sort_order))
      .limit(1)
      .get();
    if (next) stmts.push(db.update(productImages).set({ is_primary: 1 }).where(eq(productImages.id, next.id)));
  }
  return { stmts, removedUrl: img.url };
}

/**
 * Résout le prix effectif d'une variante couleur proposée par un
 * `set_variants` : son prix propre, sauf si `uniformPrice` est vrai ou
 * qu'elle n'en porte pas, auquel cas c'est le prix de base du produit.
 *
 * Fonction pure et exportée, appelée par les DEUX endroits qui doivent
 * produire exactement le même prix pour la même entrée : `buildSetVariantsStatements`
 * ci-dessous (ce que l'application écrira réellement) et l'aperçu affiché sur
 * /revisions (`diffVariants`, components/admin/revision-diff.tsx). Un
 * commentaire disant « même formule qu'à l'application » ne suffit pas à
 * empêcher les deux de diverger un jour — ce dépôt en a déjà payé le prix
 * ailleurs ; une seule fonction importée par les deux le garantit
 * structurellement. Même remède que `freeContentLayout`
 * (components/storefront/product-story/story-free-content.tsx), importé tel
 * quel par le panneau « Actuel » de cet écran plutôt que réécrit.
 */
export function resolveVariantPrice(entryPrice: number | null, uniformPrice: boolean, basePrice: number): number {
  return uniformPrice || entryPrice == null ? basePrice : entryPrice;
}

/**
 * Port de `setColorVariants` (lib/db/product-drafts.ts) pour l'application
 * d'une révision `set_variants` sur un produit PUBLIÉ (sans `is_draft = 1`) :
 * même diffing par clé couleur (`nom:hex`), même détachement des images qui
 * pointaient sur une variante retirée, même formule de prix.
 *
 * Le prix par défaut d'une variante (`uniform_price`, ou variante sans prix
 * propre) est lu sur le produit ICI, à l'application — pas figé au dépôt : la
 * révision propose des variantes, pas un prix qu'elle n'a jamais porté.
 * Toute écriture concurrente sur CE produit entre le dépôt et maintenant
 * aurait de toute façon fait passer cette révision en `superseded` avant
 * qu'elle n'atteigne ce code — voir le commentaire sur le supersede dans
 * `applyRevision`.
 *
 * Duplication assumée avec `setColorVariants` (deux `is_draft` différents
 * empêchent un simple paramètre booléen sans réécrire les deux appelants) :
 * toute évolution de la formule de prix doit être reportée dans les deux
 * fonctions — un rappel explicite plutôt qu'une dérive silencieuse.
 */
async function buildSetVariantsStatements(
  db: DrizzleDB,
  productId: string,
  input: {
    variants: { color_name: string; color_hex: string; price: number | null; stock: number }[];
    uniform_price: boolean;
  },
): Promise<{ stmts: Statement[]; stock_quantity: number }> {
  const product = await db
    .select({ base_price: products.base_price, compare_price: products.compare_price })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
    .get();
  if (!product) throw new RevisionError("not_found", "Produit introuvable.");

  const existing = await db
    .select({ id: productVariants.id, attributes: productVariants.attributes })
    .from(productVariants)
    .where(eq(productVariants.product_id, productId))
    .all();

  const existingByColor = new Map<string, string>();
  for (const v of existing) {
    try {
      const attrs = JSON.parse(v.attributes) as Record<string, unknown>;
      const keys = Object.keys(attrs);
      if (keys.length === 1 && keys[0] === "color" && typeof attrs.color === "string") existingByColor.set(attrs.color, v.id);
    } catch (e) {
      console.error("[revisions] malformed variant attributes", v.id, e);
    }
  }

  const stmts: Statement[] = [];
  const seen = new Set<string>();
  let total = 0;

  input.variants.forEach((entry, index) => {
    const key = `${entry.color_name}:${entry.color_hex}`;
    seen.add(key);
    const price = resolveVariantPrice(entry.price, input.uniform_price, product.base_price);
    const comparePrice = input.uniform_price ? product.compare_price : null;
    const attrs = JSON.stringify({ color: key });
    total += entry.stock;

    const existingId = existingByColor.get(key);
    if (existingId) {
      stmts.push(
        db.update(productVariants)
          .set({ name: entry.color_name, price, compare_price: comparePrice, stock_quantity: entry.stock, attributes: attrs })
          .where(eq(productVariants.id, existingId)),
      );
    } else {
      stmts.push(
        db.insert(productVariants).values({
          id: nanoid(), product_id: productId, name: entry.color_name, price, compare_price: comparePrice,
          stock_quantity: entry.stock, attributes: attrs, is_active: 1, sort_order: index,
          created_at: sql`datetime('now')`,
        }),
      );
    }
  });

  for (const [key, variantId] of existingByColor) {
    if (seen.has(key)) continue;
    stmts.push(db.update(productImages).set({ variant_id: null }).where(eq(productImages.variant_id, variantId)));
    stmts.push(db.delete(productVariants).where(eq(productVariants.id, variantId)));
  }

  return { stmts, stock_quantity: total };
}

/**
 * Assainit les colonnes HTML d'un payload avant stockage. Une révision ne doit
 * JAMAIS contenir du HTML non assaini : sinon la garantie dépendrait du moment
 * de l'application, et une révision déposée aujourd'hui, appliquée dans un mois
 * par un code modifié entre-temps, échapperait au contrôle.
 *
 * Ne touche à rien d'autre que les colonnes HTML connues de la cible : une
 * colonne comme `base_price` traverse inchangée. Une valeur absente ou vide
 * n'est pas assainie — `sanitizeDescriptionHtml` renverrait `""`, et le
 * storefront distingue `null`/absent d'une chaîne vide pour la visibilité des
 * onglets.
 */
export function sanitizePayload(
  target: RevisionTarget,
  targetId: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const columns = target === "banner" ? BANNER_HTML_COLUMNS : PRODUCT_HTML_COLUMNS;
  const scope = scopeFor(target, targetId);
  const out = { ...payload };
  for (const col of columns) {
    const v = out[col];
    if (typeof v === "string" && v.trim()) {
      out[col] = sanitizeDescriptionHtml(v, scope);
    }
  }
  return out;
}

/** `updated_at` de la cible, ou `null` si la ligne n'existe pas. */
async function readTargetVersion(
  db: DrizzleDB,
  target: RevisionTarget,
  targetId: string,
): Promise<string | null> {
  if (target === "banner") {
    const bannerId = Number(targetId);
    if (!Number.isInteger(bannerId)) return null;
    const row = await db
      .select({ updated_at: banners.updated_at })
      .from(banners)
      .where(eq(banners.id, bannerId))
      .limit(1)
      .get();
    return row?.updated_at ?? null;
  }
  const row = await db
    .select({ updated_at: products.updated_at })
    .from(products)
    .where(eq(products.id, targetId))
    .limit(1)
    .get();
  return row?.updated_at ?? null;
}

export async function createRevision(input: {
  target: RevisionTarget;
  targetId: string;
  kind: RevisionKind;
  payload: Record<string, unknown>;
  origin: RevisionOrigin;
  actor: RevisionActor;
  summary?: string | null;
}): Promise<{ revisionId: string; status: "pending" }> {
  // Avant toute lecture : un payload de forme invalide est un défaut de
  // l'appelant, pas de la cible — pas besoin d'un aller-retour base pour le
  // détecter.
  assertValidPayload(input.target, input.kind, input.payload);

  const db = await getDrizzle();

  // La cible doit exister, et on capture sa version pour le contrôle à
  // l'application.
  const baseVersion = await readTargetVersion(db, input.target, input.targetId);
  if (baseVersion === null) {
    throw new RevisionError("not_found", "Cible introuvable.");
  }

  const id = nanoid();
  const payload = sanitizePayload(input.target, input.targetId, input.payload);

  // Typé explicitement : un troisième `RevisionKind` qui compilerait ici sans
  // que `AuditAction` le liste produirait une ligne d'audit sans libellé
  // (AUDIT_ACTION_LABELS, lib/constants/audit.ts) sans qu'aucun test ne le
  // signale — cette annotation fait échouer la COMPILATION à la place.
  const action: AuditAction = `revision.created.${input.kind}`;

  await db.batch([
    db.insert(contentRevisions).values({
      id,
      target_type: input.target,
      target_id: input.targetId,
      kind: input.kind,
      payload: JSON.stringify(payload),
      origin: input.origin,
      actor_id: input.actor.id,
      actor_name: input.actor.name,
      summary: input.summary ?? null,
      base_version: baseVersion,
    }),
    db.insert(auditLog).values({
      id: nanoid(),
      actor_id: input.actor.id,
      actor_name: input.actor.name,
      action,
      target_type: input.target,
      target_id: input.targetId,
      details: JSON.stringify({ via: input.origin, revisionId: id }),
    }),
  ] satisfies Batch);

  return { revisionId: id, status: "pending" };
}

export interface RevisionRecord {
  id: string;
  target_type: RevisionTarget;
  target_id: string;
  kind: RevisionKind;
  payload: Record<string, unknown>;
  origin: RevisionOrigin;
  actor_id: string;
  actor_name: string;
  summary: string | null;
  status: RevisionStatus;
  base_version: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

function toRevisionRecord(row: typeof contentRevisions.$inferSelect): RevisionRecord {
  return {
    id: row.id,
    target_type: row.target_type as RevisionTarget,
    target_id: row.target_id,
    kind: row.kind as RevisionKind,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    origin: row.origin as RevisionOrigin,
    actor_id: row.actor_id,
    actor_name: row.actor_name,
    summary: row.summary,
    status: row.status as RevisionStatus,
    base_version: row.base_version,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
  };
}

/** Révisions `pending`, les plus récentes d'abord, optionnellement filtrées
 *  sur une cible (type seul, ou type + id précis). */
export async function listPendingRevisions(target?: RevisionTarget, targetId?: string): Promise<RevisionRecord[]> {
  const db = await getDrizzle();
  const conditions = [eq(contentRevisions.status, "pending")];
  if (target) conditions.push(eq(contentRevisions.target_type, target));
  if (targetId !== undefined) conditions.push(eq(contentRevisions.target_id, targetId));

  const rows = await db
    .select()
    .from(contentRevisions)
    .where(and(...conditions))
    .orderBy(desc(contentRevisions.created_at))
    .all();
  return rows.map(toRevisionRecord);
}

/** Une révision par id, quel que soit son statut, ou `null` si absente. */
export async function getRevision(id: string): Promise<RevisionRecord | null> {
  const db = await getDrizzle();
  const row = await db.select().from(contentRevisions).where(eq(contentRevisions.id, id)).limit(1).get();
  return row ? toRevisionRecord(row) : null;
}

/** Message de conflit, une seule fois : affiché tel quel par l'écran de
 *  validation (pas de texte générique) — voir actions/admin/revisions.ts. */
const TARGET_CHANGED_MESSAGE =
  "La fiche a changé depuis le dépôt de cette révision. Demandez une " +
  "proposition fraîche plutôt que d'appliquer celle-ci.";

const APPLIED_ACTION: AuditAction = "revision.applied";
const REJECTED_ACTION: AuditAction = "revision.rejected";
const APPLY_CONFLICT_ACTION: AuditAction = "revision.apply_conflict";
const RECONCILE_FAILED_ACTION: AuditAction = "revision.reconcile_failed";

/**
 * Répare un batch d'application dont l'écriture sur la cible n'a, en
 * réalité, rien changé (voir l'appelant, `applyRevision`, pour le
 * diagnostic). D1 ne sait pas annuler un batch déjà validé — une UPDATE à 0
 * ligne n'est pas une erreur pour SQLite, donc le reste du batch a committé
 * quand même — cette fonction répare donc APRÈS coup, dans un second batch :
 *
 * - remet `rev.id` en `pending` s'il a été marqué `applied` à tort (ne
 *   touche rien s'il est déjà `superseded` par une révision concurrente
 *   gagnante — ce cas-là n'a pas besoin de réparation, il est correct) ;
 * - remet en `pending` les révisions voisines, mais SEULEMENT si `CE` batch
 *   raté les a lui-même périmées — voir `supersededByThisBatch` ci-dessous ;
 * - journalise la correction : l'audit "applied" du batch raté reste en
 *   base (append-only, jamais supprimé), donc cette ligne existe pour que
 *   quiconque relit le journal comprenne que cette application n'a en fait
 *   jamais eu lieu.
 *
 * `supersededCandidateIds` seul ne suffit PAS à décider qui ressusciter : il
 * est lu AVANT le batch, donc il contient toutes les sœurs pending à ce
 * moment-là — y compris celle qui va réellement gagner la course, et celles
 * que CE gagnant périmera légitimement. Un contrôle naïf (`status =
 * "superseded"` sur ces ids) ressusciterait alors une sœur que le vrai
 * gagnant venait de résoudre correctement.
 *
 * `resolved_by = acteur courant` seul ne suffit pas non plus : le même
 * administrateur peut lancer deux applications concurrentes, et les deux
 * lignes porteraient alors son id sans que ça dise laquelle a réellement
 * gagné.
 *
 * `supersededByThisBatch` est le remède exact, pas une heuristique : c'est
 * `meta.changes` de l'instruction de péremption du batch RATÉ lui-même
 * (index 2 du batch d'`applyRevision`, commenté à cet index précis parce
 * qu'un tableau positionnel se décale silencieusement le jour où quelqu'un
 * insère une instruction au milieu) — le nombre EXACT de lignes que CE
 * batch a lui-même périmées. À 0 (le cas de la course à trois ci-dessus : le
 * gagnant avait déjà tout résolu, donc le filtre `status = "pending"` de
 * notre propre instruction ne matchait plus rien), on ne ressuscite
 * personne. À N > 0, on sait que CE batch a bien périmé N sœurs, et
 * `resolved_by = acteur` cible précisément celles qu'IL a marquées (et pas
 * une sœur périmée par un autre batch, gagnant celui-là, même si le même
 * administrateur l'a lancé).
 */
async function reconcileFailedApply(
  db: DrizzleDB,
  rev: RevisionRecord,
  actor: RevisionActor,
  supersededCandidateIds: string[],
  supersededByThisBatch: number,
): Promise<void> {
  const stmts: Statement[] = [
    db
      .update(contentRevisions)
      .set({ status: "pending", resolved_at: null, resolved_by: null })
      .where(and(eq(contentRevisions.id, rev.id), eq(contentRevisions.status, "applied"))),
  ];

  if (supersededByThisBatch > 0 && supersededCandidateIds.length > 0) {
    stmts.push(
      db
        .update(contentRevisions)
        .set({ status: "pending", resolved_at: null, resolved_by: null })
        .where(and(
          inArray(contentRevisions.id, supersededCandidateIds),
          eq(contentRevisions.status, "superseded"),
          eq(contentRevisions.resolved_by, actor.id),
        )),
    );
  }

  stmts.push(
    db.insert(auditLog).values({
      id: nanoid(),
      actor_id: actor.id,
      actor_name: actor.name,
      action: APPLY_CONFLICT_ACTION,
      target_type: rev.target_type,
      target_id: rev.target_id,
      details: JSON.stringify({
        via: "admin",
        revisionId: rev.id,
        reason: "target_changed_since_deposit",
      }),
    }),
  );

  await db.batch(stmts as Batch);
}

/**
 * Écrit `payload` sur la ligne cible (produit ou bannière) et clôt la
 * révision, en un seul `db.batch()` : c'est l'écriture qui atteint le client
 * final, donc tout ou rien.
 *
 * Le contrôle de version compare `base_version` (capturé au dépôt, voir
 * `createRevision`) à l'`updated_at` actuel de la cible. S'ils diffèrent, la
 * fiche a changé depuis le dépôt — la proposition repose peut-être sur un
 * état qui n'existe plus — et on refuse plutôt que d'écraser ce changement
 * sans que personne ne l'ait vu.
 *
 * Ce contrôle, lu ci-dessus, n'est PAS à lui seul suffisant : entre cette
 * lecture et le batch plus bas, une autre écriture sur la même cible peut
 * s'intercaler — une autre révision appliquée en même temps sur la même
 * fiche, ou une édition directe du produit. Sans le répéter dans le WHERE de
 * l'écriture elle-même, la fenêtre entre lecture et écriture permettrait à
 * deux applications concurrentes de toutes les deux "réussir", la seconde
 * écrasant la première sans qu'aucun signal ne le dise. `current` (non-null
 * ici) est donc reporté tel quel comme prédicat de l'UPDATE de la cible, et
 * la ligne de révision elle-même n'est marquée `applied` que si elle est
 * encore `pending` au moment du batch — pas seulement au moment de cette
 * lecture.
 *
 * Toute autre révision `pending` de la MÊME cible passe à `superseded` :
 * deux propositions concurrentes sur la même fiche ne doivent pas pouvoir
 * s'appliquer l'une après l'autre à l'insu de qui a validé la première. Une
 * révision `pending` d'une autre cible n'est jamais touchée.
 */
export async function applyRevision(
  revisionId: string,
  actor: RevisionActor,
): Promise<{ applied: true; superseded: number }> {
  const db = await getDrizzle();
  const rev = await getRevision(revisionId);
  if (!rev) throw new RevisionError("not_found", "Révision introuvable.");
  if (rev.status !== "pending") {
    throw new RevisionError("conflict", `Révision déjà ${rev.status}.`);
  }

  const current = await readTargetVersion(db, rev.target_type, rev.target_id);
  if (current === null) {
    throw new RevisionError("not_found", "La cible a disparu depuis le dépôt.");
  }
  if (current !== rev.base_version) {
    throw new RevisionError("conflict", TARGET_CHANGED_MESSAGE);
  }

  // Re-vérifié ici, pas seulement au dépôt (`createRevision`) : la garantie
  // ne doit pas dépendre de l'ordre dans lequel les chemins d'écriture ont
  // été livrés. La phase 2 (cinq outils généralisés) commence juste après
  // cette PR ; si un futur chemin dépose un jour une ligne
  // `content_revisions` sans passer par `createRevision`, cette ligne reste
  // la seule qui écrit réellement sur la cible et doit donc rester, elle
  // aussi, sourde à `is_draft`/`id`/`slug`.
  assertValidPayload(rev.target_type, rev.kind, rev.payload);

  // Comptées avant le batch pour le retour à l'appelant. La même condition de
  // filtrage (cible + pending) est répétée dans l'UPDATE du batch ci-dessous,
  // donc l'écriture réelle reste correcte même si une nouvelle révision est
  // déposée sur cette cible entre ce SELECT et le batch — seul le nombre
  // rapporté pourrait alors sous-compter d'une unité. Réutilisée aussi par
  // `reconcileFailedApply` si l'écriture rate : ce sont exactement les
  // révisions que CE batch s'apprête à marquer `superseded`.
  const others = await db
    .select({ id: contentRevisions.id })
    .from(contentRevisions)
    .where(and(
      eq(contentRevisions.target_type, rev.target_type),
      eq(contentRevisions.target_id, rev.target_id),
      eq(contentRevisions.status, "pending"),
      ne(contentRevisions.id, rev.id),
    ))
    .all();
  const otherIds = others.map((o) => o.id);

  // Enrichissement selon la nature de la révision. `update` écrit ses
  // colonnes directement sur la cible (comportement de la phase 1) ;
  // `publish` ne porte plus de colonnes — voir `publish_product`,
  // lib/mcp/tools/products.ts, qui dépose systématiquement un payload vide —
  // seul `is_draft` change, jamais le contenu. Les trois natures de la
  // généralisation des outils (`add_images`, `remove_image`,
  // `set_variants`) n'ont aucune colonne `products` à écrire : la cible
  // n'obtient que l'ancre de concurrence (`updated_at`), et l'écriture
  // réelle vient d'`extraStatements`, vers une table enfant du produit.
  const targetSet: Record<string, unknown> = { updated_at: sql`datetime('now')` };
  let extraStatements: Statement[] = [];
  let afterCommit: (() => Promise<void>) | null = null;

  if (rev.kind === "update") {
    Object.assign(targetSet, rev.payload);
  } else if (rev.kind === "publish") {
    if (rev.target_type === "product") targetSet.is_draft = 0;
  } else if (rev.kind === "add_images") {
    // La clé R2 est déjà en place depuis le dépôt (voir le commentaire de
    // haut de fichier de lib/mcp/tools/products.ts sur le cycle de vie R2) :
    // l'application ne fait qu'insérer les lignes `product_images`, jamais
    // de téléchargement — c'est précisément ce qui évite qu'Appliquer
    // échoue sur un réseau, longtemps après que l'administrateur a cliqué.
    const { images } = rev.payload as { images: { key: string; alt: string | null }[] };
    extraStatements = images.map((img) =>
      insertRevisionImageStatement(db, rev.target_id, { id: nanoid(), key: img.key, alt: img.alt }));
  } else if (rev.kind === "remove_image") {
    const { image_id } = rev.payload as { image_id: string };
    const removal = await buildRemoveImageStatements(db, rev.target_id, image_id);
    extraStatements = removal.stmts;
    // Le fichier R2 n'est supprimé qu'APRÈS le commit du batch (voir plus
    // bas) : tant que la ligne `product_images` existe encore, un échec
    // avant ce point laisse une image cohérente en base et en stockage,
    // plutôt qu'une ligne supprimée pointant vers un objet qui a survécu.
    afterCommit = () =>
      deleteFromR2(r2KeyFromImageUrl(removal.removedUrl)).catch((e) => {
        console.warn("[revisions] orphan R2 object after remove_image apply", removal.removedUrl, e);
      });
  } else if (rev.kind === "set_variants") {
    const variants = await buildSetVariantsStatements(db, rev.target_id, rev.payload as {
      variants: { color_name: string; color_hex: string; price: number | null; stock: number }[];
      uniform_price: boolean;
    });
    extraStatements = variants.stmts;
    targetSet.stock_quantity = variants.stock_quantity;
  }

  // `current` (non-null, vérifié ci-dessus) est la valeur que le
  // pré-contrôle vient de comparer à `base_version` : la reporter ici rend
  // l'écriture atomique avec ce contrôle — voir le commentaire au-dessus de
  // la fonction.
  const targetStatement =
    rev.target_type === "banner"
      ? db
          .update(banners)
          .set(targetSet as Partial<typeof banners.$inferInsert>)
          .where(and(eq(banners.id, Number(rev.target_id)), eq(banners.updated_at, current)))
      : db
          .update(products)
          .set(targetSet as Partial<typeof products.$inferInsert>)
          .where(and(eq(products.id, rev.target_id), eq(products.updated_at, current)));

  // Indices fixes du batch positionnel ci-dessous — commentés parce qu'un
  // tableau positionnel se décale silencieusement le jour où quelqu'un
  // insère une instruction au milieu sans mettre à jour ces constantes.
  const TARGET_STATEMENT_INDEX = 0;
  const SUPERSEDE_STATEMENT_INDEX = 2;

  const stmts: Batch = [
    targetStatement,
    // `eq(status, "pending")` : ne marque `applied` que si rien n'a déjà
    // résolu cette révision entre la lecture ci-dessus et ce batch — sinon
    // une révision qu'une AUTRE application concurrente vient de passer
    // `superseded` (voir l'UPDATE ci-dessous, d'un batch gagnant) resterait
    // "applied" alors que ce batch-ci n'a en réalité rien écrit.
    db
      .update(contentRevisions)
      .set({ status: "applied", resolved_at: sql`datetime('now')`, resolved_by: actor.id })
      .where(and(eq(contentRevisions.id, rev.id), eq(contentRevisions.status, "pending"))),
    // Portée sur target_type + target_id : une révision pending d'une autre
    // cible ne matche jamais cette clause et n'est donc jamais touchée. Son
    // `meta.changes` (index `SUPERSEDE_STATEMENT_INDEX`) dit EXACTEMENT
    // combien de sœurs CE batch a lui-même périmées — voir
    // `reconcileFailedApply`, qui s'en sert pour décider qui ressusciter si
    // ce batch échoue en réalité.
    db
      .update(contentRevisions)
      .set({ status: "superseded", resolved_at: sql`datetime('now')`, resolved_by: actor.id })
      .where(and(
        eq(contentRevisions.target_type, rev.target_type),
        eq(contentRevisions.target_id, rev.target_id),
        eq(contentRevisions.status, "pending"),
        ne(contentRevisions.id, rev.id),
      )),
    db.insert(auditLog).values({
      id: nanoid(),
      actor_id: actor.id,
      actor_name: actor.name,
      action: APPLIED_ACTION,
      target_type: rev.target_type,
      target_id: rev.target_id,
      details: JSON.stringify({ via: "admin", revisionId: rev.id, kind: rev.kind }),
    }),
    // Ajoutées en fin de tableau : les index fixes ci-dessus (0 et 2) restent
    // corrects quel que soit le nombre d'écritures enfant qu'une révision
    // `add_images`/`remove_image`/`set_variants` y ajoute.
    ...extraStatements,
  ];

  const results = await db.batch(stmts);
  const targetResult = results[TARGET_STATEMENT_INDEX] as D1Result;

  if ((targetResult?.meta?.changes ?? 0) === 0) {
    // Le prédicat de `targetStatement` n'a matché aucune ligne : la cible a
    // changé entre le pré-contrôle ci-dessus et ce batch (une autre
    // application concurrente sur la même cible est passée entre les deux).
    // Le batch a malgré tout committé — voir `reconcileFailedApply` — donc
    // cette ligne de révision, et éventuellement ses voisines, peuvent
    // affirmer un statut que l'écriture réelle ne soutient pas.
    const supersedeResult = results[SUPERSEDE_STATEMENT_INDEX] as D1Result;
    const supersededByThisBatch = supersedeResult?.meta?.changes ?? 0;

    try {
      await reconcileFailedApply(db, rev, actor, otherIds, supersededByThisBatch);
    } catch (reconcileError) {
      // La réconciliation elle-même a échoué (D1 injoignable, par exemple) :
      // la ligne reste dans l'état faux laissé par le batch raté. Pas de
      // reprise automatique ici — une boucle de réconciliation qui échoue en
      // boucle serait pire que le problème — mais au minimum une trace
      // distincte pour qu'on retrouve cette ligne plus tard. Best-effort :
      // si cet insert échoue aussi, on ne masque pas l'erreur d'origine.
      console.error(
        "[revisions] reconcileFailedApply a échoué — la ligne reste dans un état incorrect",
        { revisionId: rev.id },
        reconcileError,
      );
      try {
        await db.insert(auditLog).values({
          id: nanoid(),
          actor_id: actor.id,
          actor_name: actor.name,
          action: RECONCILE_FAILED_ACTION,
          target_type: rev.target_type,
          target_id: rev.target_id,
          details: JSON.stringify({ via: "admin", revisionId: rev.id, reason: "reconcile_failed" }),
        });
      } catch (auditError) {
        console.error(
          "[revisions] l'audit revision.reconcile_failed a aussi échoué",
          { revisionId: rev.id },
          auditError,
        );
      }
    }

    // Le résultat pour l'appelant est le même dans les deux cas (réconcilié
    // ou non) : rien n'a été écrit sur la cible, et le message invite à
    // redemander une proposition fraîche plutôt qu'à réessayer celle-ci.
    throw new RevisionError("conflict", TARGET_CHANGED_MESSAGE);
  }

  // Le batch a réellement écrit la cible : `remove_image` peut maintenant
  // effacer le fichier R2 devenu orphelin en toute sécurité (voir plus haut).
  // Best-effort et hors transaction — R2 n'est jamais atomique avec D1 — un
  // échec ici est journalisé, jamais renvoyé à l'appelant : l'application a
  // déjà réussi.
  if (afterCommit) await afterCommit();

  return { applied: true, superseded: others.length };
}

/** Message de conflit du jumeau de `applyRevision` : une autre résolution
 *  (le plus souvent une application concurrente) a gagné la course pendant
 *  que ce rejet était en vol. */
const REJECT_RACE_MESSAGE =
  "Cette révision a été résolue par quelqu'un d'autre (probablement " +
  "appliquée) pendant que vous la rejetiez. Rechargez la page pour voir " +
  "son état actuel.";

/**
 * Rejette une révision `pending` sans jamais écrire sur la cible : seule la
 * ligne de révision et l'audit changent.
 *
 * Jumeau exact d'`applyRevision`, avec le même défaut qui y a été fermé sur
 * deux tours de revue avant qu'on ne pense à le chercher ici : le contrôle
 * `rev.status !== "pending"` ci-dessus n'est pas atomique avec l'écriture
 * tant qu'il n'est pas répété dans son WHERE. Sans lui, une application et
 * un rejet concurrents sur la MÊME révision pouvaient tous les deux
 * "réussir" — la fiche en ligne (l'application l'y a mise) et le journal
 * d'audit (qui affirme un rejet) racontant alors deux histoires
 * contradictoires, celle qu'on relit dans six mois pour comprendre.
 *
 * Contrairement à `applyRevision`, aucune réconciliation n'est nécessaire
 * ici en cas de course perdue : l'UPDATE (avec son prédicat `status =
 * "pending"`) est exécuté SEUL, son `meta.changes` inspecté, et la ligne
 * d'audit n'est écrite qu'APRÈS cette confirmation — jamais dans le même
 * batch qu'une écriture dont on ne connaît pas encore l'issue. Il n'y a
 * donc rien à corriger après coup, seulement à refuser.
 */
export async function rejectRevision(revisionId: string, actor: RevisionActor): Promise<{ rejected: true }> {
  const db = await getDrizzle();
  const rev = await getRevision(revisionId);
  if (!rev) throw new RevisionError("not_found", "Révision introuvable.");
  if (rev.status !== "pending") {
    throw new RevisionError("conflict", `Révision déjà ${rev.status}.`);
  }

  const results = await db.batch([
    db
      .update(contentRevisions)
      .set({ status: "rejected", resolved_at: sql`datetime('now')`, resolved_by: actor.id })
      .where(and(eq(contentRevisions.id, rev.id), eq(contentRevisions.status, "pending"))),
  ] satisfies Batch);
  const updateResult = results[0] as D1Result;

  if ((updateResult?.meta?.changes ?? 0) === 0) {
    throw new RevisionError("conflict", REJECT_RACE_MESSAGE);
  }

  await db.insert(auditLog).values({
    id: nanoid(),
    actor_id: actor.id,
    actor_name: actor.name,
    action: REJECTED_ACTION,
    target_type: rev.target_type,
    target_id: rev.target_id,
    details: JSON.stringify({ via: "admin", revisionId: rev.id }),
  });

  // Cycle de vie R2 d'une révision `add_images` : ses objets ont déjà été
  // téléversés au dépôt (lib/mcp/tools/products.ts), avant même que cette
  // ligne existe — voir le payload, qui porte leur clé. Aucune ligne
  // `product_images` ne les référencera jamais puisque cette révision ne
  // sera plus jamais appliquée : les laisser sans les effacer les rend
  // orphelins pour toujours dans R2. Best-effort, comme tout le nettoyage R2
  // de ce fichier : un échec ici ne doit pas faire échouer un rejet déjà
  // acté en base — seulement laisser une trace pour qu'on retrouve l'objet.
  if (rev.kind === "add_images" && rev.target_type === "product") {
    const images = (rev.payload as { images?: { key: string }[] }).images ?? [];
    const cleanup = await Promise.allSettled(images.map((img) => deleteFromR2(img.key)));
    cleanup.forEach((c, i) => {
      if (c.status === "rejected") {
        console.warn("[revisions] orphan R2 object after reject", images[i]?.key, c.reason);
      }
    });
  }

  return { rejected: true };
}
