import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { nanoid } from "nanoid";
import { getDrizzle, type DrizzleDB } from "@/lib/db/drizzle";
import { auditLog, banners, contentRevisions, productImages, productVariants, products } from "@/lib/db/schema";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { deleteFromR2 } from "@/lib/storage/images";
import { MAX_IMAGES_PER_PRODUCT, r2KeyFromImageUrl, resolveVariantPrice } from "@/lib/db/product-drafts";
import type { AuditAction } from "@/lib/db/types";
import { isWithdrawalConfirmed } from "@/lib/revisions/withdraw-confirmation";

// Ré-exportée telle quelle : `components/admin/revision-diff.tsx` et les
// tests de ce fichier l'importent depuis `@/lib/db/revisions` — définie
// maintenant dans lib/db/product-drafts.ts (voir son commentaire) pour que
// `setColorVariants` cesse de la dupliquer, sans faire de ce fichier-ci un
// second point d'écriture de la formule.
export { resolveVariantPrice };

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
 * `withdraw` (§ 2.6) : retire du public un produit ou une bannière. Son
 * payload est vide et `applyRevision` seul écrit `is_active = 0`.
 * `reactivate` (§ 2.6 bis) : remet en ligne un PRODUIT retiré (publié, inactif).
 * Son payload est vide et `applyRevision` seul écrit `is_active = 1`. Les
 * bannières se remettent en ligne depuis leur liste d'administration.
 */
export type RevisionKind =
  | "update"
  | "publish"
  | "create"
  | "withdraw"
  | "reactivate"
  | "add_images"
  | "remove_image"
  | "set_variants";
export type RevisionOrigin = "mcp" | "admin_chat";
export type RevisionStatus = "pending" | "applied" | "rejected" | "superseded";

/**
 * Libellé humain d'une `RevisionKind`, partagé par la liste (/revisions) et
 * le détail (/revisions/[id]) — deux listes maintenues à la main avaient
 * divergé (revue de phase, item 5) : la liste n'avait jamais reçu les trois
 * natures de la généralisation des outils, donc son badge affichait le nom
 * technique brut (`add_images`) au lieu d'un libellé. `Record<RevisionKind,
 * string>` (pas `Record<string, string>`) fait échouer la COMPILATION si une
 * future `RevisionKind` est ajoutée sans son libellé ici — un seul endroit où
 * se tromper, comme `PRODUCT_HTML_COLUMNS` ci-dessus.
 */
export const REVISION_KIND_LABELS: Record<RevisionKind, string> = {
  update: "Modification",
  publish: "Publication",
  create: "Création",
  withdraw: "Retrait",
  reactivate: "Remise en ligne",
  add_images: "Ajout d'images",
  remove_image: "Suppression d'image",
  set_variants: "Variantes",
};

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
 * - `is_draft` et `is_active` — § 2.6 du spec : ni l'un ni l'autre ne se
 *   modifie par un payload. `products.is_active = 0` retire une fiche de sa
 *   page, de toutes les catégories et de la recherche : dans la liste blanche,
 *   il ouvrait un canal de dépublication complet par l'interface même que
 *   cette liste garde (la phase 5 dépose par ce `createRevision` sans passer
 *   par les schémas Zod). `applyRevision` reste seul à les poser, pour la
 *   nature qui le déclare : `publish` écrit les DEUX (§ 2.8) ; `withdraw`
 *   (§ 2.6) écrit `is_active = 0` seul, avec son propre écran.
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
export const PRODUCT_WRITABLE_COLUMN_LIST = [
  "category_id",
  "name",
  "description",
  "description_type",
  "short_description",
  "base_price",
  "compare_price",
  "sku",
  "brand",
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
] as const;
export type ProductWritableColumn = (typeof PRODUCT_WRITABLE_COLUMN_LIST)[number];
const PRODUCT_WRITABLE_COLUMNS = new Set<string>(PRODUCT_WRITABLE_COLUMN_LIST);

/** Pas d'`id`/`created_at`/`updated_at` — mêmes raisons que pour les
 *  produits. Les bannières n'ont ni `slug` ni `is_draft`.
 *
 *  Pas d'`is_active` non plus (§ 2.6) : l'exception transitoire est refermée.
 *  Activer une bannière est l'affaire de la nature `create`, la retirer celle
 *  de `withdraw` — aucun payload ne pose cette colonne. */
export const BANNER_WRITABLE_COLUMN_LIST = [
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
  "starts_at",
  "ends_at",
] as const;
export type BannerWritableColumn = (typeof BANNER_WRITABLE_COLUMN_LIST)[number];
const BANNER_WRITABLE_COLUMNS = new Set<string>(BANNER_WRITABLE_COLUMN_LIST);

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
  if (kind === "publish") {
    // Une publication ne porte AUCUNE colonne : `applyRevision` n'assigne pas
    // son payload (seuls is_draft et is_active changent). Accepter des champs
    // ici les ferait afficher à l'écran « tels qu'ils paraîtront » puis jeter
    // en silence, la révision passant `applied`.
    if (Object.keys(payload).length > 0) {
      throw new RevisionError("validation_error", "Une révision \"publish\" ne porte aucun champ : le payload doit être vide.");
    }
    return;
  }
  if (kind === "withdraw") {
    // Même règle que `publish` : le retrait n'est PAS dans le payload. Seul
    // `applyRevision` écrit `is_active = 0`, pour cette nature ; un payload
    // qui porterait `is_active` (ou tout autre champ) serait jeté en silence
    // à l'application, après avoir été montré à l'écran.
    if (Object.keys(payload).length > 0) {
      throw new RevisionError("validation_error", "Une révision \"withdraw\" ne porte aucun champ : le payload doit être vide.");
    }
    return;
  }
  if (kind === "reactivate") {
    // Symétrique de `withdraw` : la remise en ligne n'est PAS dans le payload. Seul
    // `applyRevision` écrit `is_active = 1`, pour cette nature. Un payload qui
    // porterait des champs serait montré puis jeté — ou, pire, laisserait croire
    // qu'une remise en ligne peut aussi modifier la fiche.
    if (target !== "product") {
      throw new RevisionError("validation_error", "Une révision \"reactivate\" ne s'applique qu'à un produit.");
    }
    if (Object.keys(payload).length > 0) {
      throw new RevisionError("validation_error", "Une révision \"reactivate\" ne porte aucun champ : le payload doit être vide.");
    }
    return;
  }
  if (kind === "update") {
    assertWritablePayload(target, payload);
    return;
  }
  if (kind === "create") {
    // Seule une bannière se crée par révision : la ligne existe déjà, inactive
    // (`insertInactiveBanner`), et c'est `applyRevision` qui l'active.
    if (target !== "banner") {
      throw new RevisionError("validation_error", `Une révision "create" ne s'applique qu'à une bannière.`);
    }
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
    // Exigé explicitement plutôt que laissé absent : l'aperçu de l'écran de
    // validation (`parseSetVariantsPayload`, components/admin/revision-diff.tsx)
    // lit une valeur absente comme `true` (`uniform_price !== false`), tandis
    // qu'`resolveVariantPrice` ci-dessous la lit comme falsy (`uniformPrice ||
    // …`) — un payload sans `uniform_price` ferait donc voir à l'administrateur
    // le prix de base pendant que l'application écrirait le prix propre de
    // chaque variante. Le schéma Zod du MCP (`setVariantsSchema`) le
    // défaut déjà à `true`, donc ce cas n'est pas atteignable par les outils
    // MCP aujourd'hui — mais la phase 3 (chat admin) dépose par le même
    // `createRevision`, sans passer par ce schéma : la garantie doit donc
    // tenir ici, pas seulement chez un appelant qui pense à la respecter.
    if (typeof (payload as { uniform_price?: unknown }).uniform_price !== "boolean") {
      throw new RevisionError("validation_error", "Le payload set_variants doit porter uniform_price (booléen).");
    }
      // Même raisonnement, appliqué au contenu du tableau : `setVariantsSchema`
      // contraint déjà chaque entrée côté MCP, mais `buildSetVariantsStatements`
      // et l'aperçu consommeraient sans broncher une couleur vide, un stock
      // négatif ou un prix fractionnaire déposés par un autre appelant. Les
      // bornes reprennent celles du schéma Zod, volontairement — deux jeux de
      // règles qui divergeraient seraient pires qu'un seul.
      variants.forEach((v, i) => {
        const e = v as { color_name?: unknown; color_hex?: unknown; stock?: unknown; price?: unknown };
        const refuse = (quoi: string): never => {
          throw new RevisionError("validation_error", `Variante ${i + 1} : ${quoi}.`);
        };
        if (typeof e.color_name !== "string" || e.color_name.trim() === "") refuse("nom de couleur manquant");
        if (typeof e.color_hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(e.color_hex)) refuse("couleur hex invalide (format #rrggbb)");
        if (!Number.isInteger(e.stock) || (e.stock as number) < 0) refuse("stock invalide (entier positif ou nul attendu)");
        if (e.price != null && (!Number.isInteger(e.price) || (e.price as number) < 0)) refuse("prix invalide (entier positif ou nul, ou null)");
      });
  }
}

/**
 * Clause EXISTS qui borne une écriture enfant (`product_images`,
 * `product_variants`) à la version de la cible que `applyRevision` vient de
 * vérifier (`current`). D1 committe un batch entier même quand une de ses
 * instructions ne touche 0 ligne (voir le commentaire au-dessus
 * d'`applyRevision`) : `targetStatement` porte déjà ce contrôle sur
 * `products`, mais une révision `add_images`/`remove_image`/`set_variants`
 * n'écrit AUCUNE colonne de `products` — sa seule écriture réelle vise une
 * table fille. Sans cette clause sur CHAQUE écriture fille, elle committerait
 * quand même sur la fiche live alors que `targetStatement`, lui, n'a rien
 * changé : c'est exactement le défaut relevé en revue de phase — un
 * commentaire (« rien n'a été écrit sur la cible ») affirmait une garantie
 * que le code de la phase 2 avait rendue fausse pour ces trois natures.
 */
function productVersionGuard(productId: string, current: string) {
  return sql`exists (select 1 from ${products} where ${products.id} = ${productId} and ${products.updated_at} = ${current})`;
}

/**
 * Jumeau de `insertImageStatement` (lib/db/product-drafts.ts), sans le
 * filtre `is_draft = 1` : la cible d'une révision `add_images` est par
 * construction un produit PUBLIÉ (`writePath`, lib/mcp/tools/products.ts) —
 * un brouillon écrit directement et ne passe jamais par ici. Même calcul SQL
 * de `sort_order`/`is_primary` et même garde du plafond d'images, pour que
 * les deux chemins ne divergent jamais sur la même règle.
 *
 * `current` (version lue par `applyRevision`) rejoint `products.id` dans le
 * WHERE de la ligne déjà sélectionnée `from(products)` — pas une clause
 * EXISTS séparée, celle-ci l'a déjà pour source : une seule colonne de plus
 * suffit à fermer B1 pour cette écriture précise.
 */
function insertRevisionImageStatement(
  db: DrizzleDB,
  productId: string,
  current: string,
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
        eq(products.updated_at, current),
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
 *
 * `current` porte `productVersionGuard` sur LES DEUX écritures (suppression
 * ET promotion de la nouvelle image principale) : sans la seconde, une
 * course laisserait une image arbitraire d'une fiche live devenir principale
 * alors que la suppression elle-même, protégée, n'aurait rien fait.
 */
async function buildRemoveImageStatements(
  db: DrizzleDB,
  productId: string,
  current: string,
  imageId: string,
): Promise<{ stmts: Statement[]; removedUrl: string }> {
  const img = await db
    .select({ id: productImages.id, url: productImages.url, is_primary: productImages.is_primary })
    .from(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.product_id, productId)))
    .limit(1)
    .get();
  if (!img) throw new RevisionError("not_found", "Image introuvable sur ce produit.");

  const guard = productVersionGuard(productId, current);
  const stmts: Statement[] = [db.delete(productImages).where(and(eq(productImages.id, imageId), guard))];
  if (img.is_primary === 1) {
    const next = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(and(eq(productImages.product_id, productId), ne(productImages.id, imageId)))
      .orderBy(asc(productImages.sort_order))
      .limit(1)
      .get();
    if (next) {
      stmts.push(db.update(productImages).set({ is_primary: 1 }).where(and(eq(productImages.id, next.id), guard)));
    }
  }
  return { stmts, removedUrl: img.url };
}

/**
 * Jumeau, pour une variante, d'`insertRevisionImageStatement` ci-dessus :
 * `insert().select()` plutôt qu'un simple `.values()`, pour porter la même
 * clause `products.updated_at = current` dans son propre WHERE — un
 * `.values()` brut n'a pas de WHERE, donc pas de moyen de refuser l'insertion
 * quand la version de la cible a changé.
 */
function insertRevisionVariantStatement(
  db: DrizzleDB,
  productId: string,
  current: string,
  row: { id: string; name: string; price: number; comparePrice: number | null; stock: number; attributes: string; sortOrder: number },
): Statement {
  return db.insert(productVariants).select(
    db
      .select({
        id: sql<string>`${row.id}`.as("id"),
        product_id: sql<string>`${productId}`.as("product_id"),
        name: sql<string>`${row.name}`.as("name"),
        sku: sql<string | null>`null`.as("sku"),
        price: sql<number>`${row.price}`.as("price"),
        compare_price: sql<number | null>`${row.comparePrice}`.as("compare_price"),
        stock_quantity: sql<number>`${row.stock}`.as("stock_quantity"),
        attributes: sql<string>`${row.attributes}`.as("attributes"),
        is_active: sql<number>`1`.as("is_active"),
        sort_order: sql<number>`${row.sortOrder}`.as("sort_order"),
        created_at: sql<string>`datetime('now')`.as("created_at"),
      })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.updated_at, current))),
  );
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
 * `applyRevision`. `current` (la version lue par `applyRevision`) porte
 * `productVersionGuard` sur CHAQUE écriture ci-dessous — insertion, mise à
 * jour ET suppression de variante, détachement d'image — pour la même raison
 * que sur `buildRemoveImageStatements` : sans elle, une course laisserait
 * l'ensemble des variantes se faire remplacer sur la fiche live pendant que
 * `targetStatement` (et donc `stock_quantity`, porté dessus) n'aurait rien
 * écrit — un stock faux sur une boutique en paiement à la livraison.
 *
 * Duplication assumée avec `setColorVariants` pour la formule de prix
 * seulement (`resolveVariantPrice`, importée de lib/db/product-drafts.ts, est
 * elle strictement partagée) : `is_draft` reste géré séparément par chaque
 * appelant, dans le SELECT et l'UPDATE qui l'entourent.
 */
async function buildSetVariantsStatements(
  db: DrizzleDB,
  productId: string,
  current: string,
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

  const guard = productVersionGuard(productId, current);
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
          .where(and(eq(productVariants.id, existingId), guard)),
      );
    } else {
      stmts.push(
        insertRevisionVariantStatement(db, productId, current, {
          id: nanoid(), name: entry.color_name, price, comparePrice, stock: entry.stock, attributes: attrs, sortOrder: index,
        }),
      );
    }
  });

  for (const [key, variantId] of existingByColor) {
    if (seen.has(key)) continue;
    stmts.push(db.update(productImages).set({ variant_id: null }).where(and(eq(productImages.variant_id, variantId), guard)));
    stmts.push(db.delete(productVariants).where(and(eq(productVariants.id, variantId), guard)));
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

/**
 * Nom que l'administrateur doit saisir pour confirmer un retrait : le nom du
 * produit, le titre de la bannière. `null` si la ligne n'existe plus.
 */
async function readTargetName(db: DrizzleDB, target: RevisionTarget, targetId: string): Promise<string | null> {
  if (target === "banner") {
    const bannerId = Number(targetId);
    if (!Number.isInteger(bannerId)) return null;
    const row = await db.select({ name: banners.title }).from(banners).where(eq(banners.id, bannerId)).limit(1).get();
    return row?.name ?? null;
  }
  const row = await db.select({ name: products.name }).from(products).where(eq(products.id, targetId)).limit(1).get();
  return row?.name ?? null;
}

/**
 * Un retrait n'a de sens que sur une cible ACTUELLEMENT en ligne. Vérifié au
 * dépôt, dans `createRevision` et non dans les outils : la garantie ne doit pas
 * dépendre de l'appelant (la surface conversationnelle dépose par le même
 * chemin). Sans elle, `withdraw_product` sur un brouillon déposerait une
 * révision dont l'écran dirait « retirer cette fiche » d'une fiche que
 * personne ne voit.
 */
async function assertWithdrawable(db: DrizzleDB, target: RevisionTarget, targetId: string): Promise<void> {
  if (target === "banner") {
    const row = await db
      .select({ is_active: banners.is_active })
      .from(banners)
      .where(eq(banners.id, Number(targetId)))
      .limit(1)
      .get();
    if (!row) throw new RevisionError("not_found", "Cible introuvable.");
    if (!row.is_active) throw new RevisionError("conflict", "Cette bannière est déjà retirée (inactive).");
    return;
  }
  const row = await db
    .select({ is_active: products.is_active, is_draft: products.is_draft })
    .from(products)
    .where(eq(products.id, targetId))
    .limit(1)
    .get();
  if (!row) throw new RevisionError("not_found", "Cible introuvable.");
  if (row.is_draft) {
    throw new RevisionError(
      "validation_error",
      "Ce produit est un brouillon : il n'est pas en ligne, il n'y a rien à retirer.",
    );
  }
  if (!row.is_active) throw new RevisionError("conflict", "Cette fiche est déjà retirée (inactive).");
}

/**
 * Une remise en ligne ne s'applique qu'à une fiche PUBLIÉE et RETIRÉE
 * (`is_draft = 0`, `is_active = 0`). Vérifié au dépôt ET à l'application : la
 * garantie ne doit pas dépendre de l'outil qui dépose. Sans le contrôle du
 * brouillon, une `reactivate` lèverait `is_active` d'un brouillon sans jamais
 * lever `is_draft` (§ 2.8) : invisible, mais annoncée « en ligne ». Un brouillon
 * se publie (`publish`).
 */
async function assertReactivatable(db: DrizzleDB, target: RevisionTarget, targetId: string): Promise<void> {
  if (target !== "product") {
    throw new RevisionError("validation_error", "Une révision \"reactivate\" ne s'applique qu'à un produit.");
  }
  const row = await db
    .select({ is_active: products.is_active, is_draft: products.is_draft })
    .from(products)
    .where(eq(products.id, targetId))
    .limit(1)
    .get();
  if (!row) throw new RevisionError("not_found", "Cible introuvable.");
  if (row.is_draft) {
    throw new RevisionError(
      "validation_error",
      "Ce produit est un brouillon : il ne se remet pas en ligne, il se publie (publish_product).",
    );
  }
  if (row.is_active) throw new RevisionError("conflict", "Cette fiche est déjà en ligne : rien à remettre en ligne.");
}

/**
 * Une publication ne s'applique qu'à un BROUILLON. Sans ce contrôle au dépôt,
 * un `publish` déposé sur une fiche retirée (is_draft = 0, is_active = 0) était
 * accepté puis la remettait en ligne sans la saisie qu'exige un retrait, sur un
 * écran qui ne dit pas qu'il annule un retrait. Le contrôle ne vivait que dans
 * `publish_product` : un autre appelant le contournait. Remettre en ligne une
 * fiche retirée est l'affaire de `reactivate` (§ 2.6 bis), pas de `publish`.
 */
async function assertPublishable(db: DrizzleDB, target: RevisionTarget, targetId: string): Promise<void> {
  if (target !== "product") return;
  const row = await db.select({ is_draft: products.is_draft }).from(products).where(eq(products.id, targetId)).limit(1).get();
  if (!row) throw new RevisionError("not_found", "Cible introuvable.");
  if (!row.is_draft) {
    throw new RevisionError(
      "conflict",
      "Cette fiche n'est pas un brouillon : « publish » ne s'applique qu'à un brouillon. Pour remettre en " +
      "ligne une fiche retirée, utilisez une révision « reactivate ».",
    );
  }
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
  if (input.kind === "withdraw") await assertWithdrawable(db, input.target, input.targetId);
  if (input.kind === "publish") await assertPublishable(db, input.target, input.targetId);
  if (input.kind === "reactivate") await assertReactivatable(db, input.target, input.targetId);

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
 * (l'instruction de péremption du batch d'`applyRevision`, commenté à cet index précis parce
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
  options: { confirmation?: string } = {},
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

  // Une création de bannière en attente se résout D'ABORD. Appliquer autre chose
  // sur cette ligne la passerait `superseded`, donc irrejetable : la ligne
  // resterait inactive et vide dans la liste d'administration. La supprimer à ce
  // moment-là détruirait ce que l'administrateur vient d'approuver (une mise à
  // jour, voire un retrait dont l'écran promet « rien n'est supprimé »). On refuse
  // donc, au lieu de nettoyer. `create` n'a pas de sœur `create`.
  //
  // Le message dit où mène chaque sortie, et le rejet en a DEUX : le nettoyage
  // ci-dessous ne périme les sœurs que si la ligne part, donc rejeter périme cette
  // révision quand la bannière est encore inactive (la ligne est supprimée) et la
  // laisse applicable quand elle a été activée depuis (la ligne reste). Les deux
  // branches sont mesurées : « périme les révisions sœurs en attente sur la ligne
  // supprimée » et « ne périme pas les sœurs quand la bannière survit », dans
  // `__tests__/unit/lib/db/withdraw.test.ts`. Lier la conséquence à sa condition,
  // au lieu de les juxtaposer : juxtaposées, chaque moitié dément l'autre.
  if (rev.target_type === "banner" && rev.kind !== "create") {
    const pendingCreate = await db
      .select({ id: contentRevisions.id })
      .from(contentRevisions)
      .where(and(
        eq(contentRevisions.target_type, "banner"),
        eq(contentRevisions.target_id, rev.target_id),
        eq(contentRevisions.kind, "create"),
        eq(contentRevisions.status, "pending"),
      ))
      .limit(1)
      .get();
    if (pendingCreate) {
      throw new RevisionError(
        "conflict",
        "Une création est encore en attente sur cette bannière : résolvez-la d'abord. " +
        "La rejeter supprime la bannière si elle est encore inactive, et périme alors cette révision ; " +
        "si elle a été activée depuis, la bannière reste et cette révision reste applicable. " +
        "L'appliquer périme cette révision dans tous les cas : il faudra en redemander une.",
      );
    }
  }

  // Re-vérifié à l'application : l'état de la fiche a pu changer sans toucher
  // `updated_at` (la version ci-dessus), et c'est cette ligne qui écrit `is_active = 1`.
  if (rev.kind === "reactivate") await assertReactivatable(db, rev.target_type, rev.target_id);

  // § 2.6 : un retrait se confirme par une saisie, et c'est ICI que c'est
  // exigé — pas seulement dans le composant qui affiche le champ. Un appelant
  // qui n'en affiche aucun (autre surface, script) est refusé, pas dispensé.
  if (rev.kind === "withdraw") {
    const targetName = await readTargetName(db, rev.target_type, rev.target_id);
    if (targetName === null) throw new RevisionError("not_found", "La cible a disparu depuis le dépôt.");
    if (!isWithdrawalConfirmed(options.confirmation, targetName)) {
      throw new RevisionError(
        "validation_error",
        `Retrait non confirmé : saisissez exactement « ${targetName} » pour l'appliquer.`,
      );
    }
  }

  // Comptées avant le batch pour le retour à l'appelant. La même condition de
  // filtrage (cible + pending) est répétée dans l'UPDATE du batch ci-dessous,
  // donc l'écriture réelle reste correcte même si une nouvelle révision est
  // déposée sur cette cible entre ce SELECT et le batch — seul le nombre
  // rapporté pourrait alors sous-compter d'une unité. Réutilisée aussi par
  // `reconcileFailedApply` si l'écriture rate : ce sont exactement les
  // révisions que CE batch s'apprête à marquer `superseded`.
  //
  // `kind` et `payload` sont lus en plus de `id` (pas seulement pour compter) :
  // une révision `add_images` superseded par CE batch ne pourra plus jamais
  // être ni appliquée ni rejetée — `rejectRevision` refuse tout ce qui n'est
  // plus "pending" — donc ses objets R2, déjà téléversés au dépôt, resteraient
  // orphelins pour toujours sans le nettoyage post-commit plus bas.
  const others = await db
    .select({ id: contentRevisions.id, kind: contentRevisions.kind, payload: contentRevisions.payload })
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
  // seuls `is_draft` et `is_active` changent, jamais le contenu. Les trois natures de la
  // généralisation des outils (`add_images`, `remove_image`,
  // `set_variants`) n'ont aucune colonne `products` à écrire : la cible
  // n'obtient que l'ancre de concurrence (`updated_at`), et l'écriture
  // réelle vient d'`extraStatements`, vers une table enfant du produit.
  const targetSet: Record<string, unknown> = { updated_at: sql`datetime('now')` };
  let extraStatements: Statement[] = [];
  // Reçoit les résultats positionnels du batch entier : un nettoyage R2
  // post-commit doit pouvoir s'ancrer sur le `meta.changes` de SA PROPRE
  // écriture enfant (ex. le DELETE de `remove_image`), jamais sur celui de
  // `targetStatement` — voir le commentaire au-dessus de la construction de
  // `stmts` plus bas pour la raison exacte.
  let afterCommit: ((results: unknown[]) => Promise<void>) | null = null;

  if (rev.kind === "update") {
    Object.assign(targetSet, rev.payload);
  } else if (rev.kind === "publish") {
    // § 2.8 : publier rend visible, donc DEUX colonnes. Un brouillon MCP naît
    // `is_active = 0` et la vitrine filtre sur `is_active` : ne lever que
    // `is_draft` « publiait » une fiche que personne ne voyait.
    if (rev.target_type === "product") {
      targetSet.is_draft = 0;
      targetSet.is_active = 1;
    }
  } else if (rev.kind === "withdraw") {
    // § 2.6 : `is_active = 0`, rien d'autre, posé ICI. Le payload est vide
    // (`assertValidPayload`) et n'est pas assigné : il ne peut pas dicter la
    // valeur. Le contenu, le stock, les commandes restent intacts : le retrait
    // est réversible parce qu'il ne détruit rien.
    targetSet.is_active = 0;
  } else if (rev.kind === "reactivate") {
    // § 2.6 bis : `is_active = 1`, rien d'autre, posé ICI — jamais lu du payload
    // (vide, `assertValidPayload`). `is_draft` n'est pas touché : une fiche
    // brouillon est refusée par `assertReactivatable` ci-dessus.
    targetSet.is_active = 1;
  } else if (rev.kind === "create") {
    // Les champs rédigés sont déjà sur la ligne (inactive) ; le payload ne
    // porte que le HTML assaini. L'activation est posée ICI, après le
    // payload, pour qu'il ne puisse jamais la dicter.
    Object.assign(targetSet, rev.payload);
    targetSet.is_active = 1;
  } else if (rev.kind === "add_images") {
    // La clé R2 est déjà en place depuis le dépôt (voir le commentaire de
    // haut de fichier de lib/mcp/tools/products.ts sur le cycle de vie R2) :
    // l'application ne fait qu'insérer les lignes `product_images`, jamais
    // de téléchargement — c'est précisément ce qui évite qu'Appliquer
    // échoue sur un réseau, longtemps après que l'administrateur a cliqué.
    const { images } = rev.payload as { images: { key: string; alt: string | null }[] };

    // Refuse TOUT l'apply si le total dépasserait le plafond — jamais une
    // application partielle. `insertRevisionImageStatement` porte déjà une
    // garde par ligne (`count(*) < MAX_IMAGES_PER_PRODUCT`), mais elle est
    // silencieuse : une INSERT qu'elle bloque ne compte pas comme une erreur
    // pour D1, le reste du batch committe quand même, et la révision serait
    // marquée "applied" alors qu'une partie des images proposées n'a jamais
    // atteint la fiche — les objets R2 correspondants resteraient orphelins
    // sans qu'aucun signal ne le dise. Le dépôt (lib/mcp/tools/products.ts)
    // refuse déjà ce cas avant tout téléversement ; ce contrôle-ci est le
    // filet de sécurité côté application, pour le cas où le compte a bougé
    // depuis (ex. des images ajoutées par une révision appliquée entre-temps).
    const countRow = await db
      .select({ count: sql<number>`count(*)` })
      .from(productImages)
      .where(eq(productImages.product_id, rev.target_id))
      .get();
    const existingImageCount = countRow?.count ?? 0;
    if (existingImageCount + images.length > MAX_IMAGES_PER_PRODUCT) {
      throw new RevisionError(
        "conflict",
        `Cette révision propose ${images.length} image(s), le produit en compte déjà ` +
        `${existingImageCount} : le plafond de ${MAX_IMAGES_PER_PRODUCT} images serait dépassé. Rejetez-la et ` +
        "redéposez-en une avec moins d'images.",
      );
    }

    // Ids générés ICI (pas dans le `.map` qui construit les statements) pour
    // pouvoir relire, après le commit, lesquels ont réellement atterri — voir
    // `afterCommit` plus bas.
    const imageRows = images.map((img) => ({ id: nanoid(), key: img.key, alt: img.alt }));
    extraStatements = imageRows.map((row) => insertRevisionImageStatement(db, rev.target_id, current, row));

    // Filet de sécurité complémentaire au refus ci-dessus, pas un doublon :
    // `existingImageCount` est une LECTURE d'avant le batch, pas une garantie
    // transactionnelle. `actions/admin/images.ts` (chemin d'upload direct de
    // l'admin classique, hors révisions) insère dans `product_images` sur une
    // fiche publiée SANS jamais toucher `products.updated_at` — notre garde
    // de version est donc aveugle à ce chemin-là. Un tel téléversement
    // atterrissant entre la lecture ci-dessus et l'exécution du batch laisse
    // la garde par ligne de `insertRevisionImageStatement` (qui recalcule
    // `count(*)` en direct, à l'exécution) écarter une partie de NOS images
    // en silence, alors que le reste de l'apply réussit. Même remède que le
    // chemin brouillon (`addImagesFromUrls`, lib/db/product-drafts.ts) : relire
    // ce qui a réellement atterri, nettoyer R2 pour le reste.
    afterCommit = async () => {
      // La relecture est du meilleur effort, comme le nettoyage R2 qui la suit :
      // le batch a déjà committé, donc une panne ici ne doit PAS faire échouer
      // une application réussie. Sans ce catch, l'administrateur verrait une
      // erreur pour un clic qui a marché — exactement ce que le commentaire au
      // point d'appel de `afterCommit` promet de ne jamais faire.
      let landed: { id: string }[];
      try {
        landed = await db
          .select({ id: productImages.id })
          .from(productImages)
          .where(inArray(productImages.id, imageRows.map((r) => r.id)))
          .all();
      } catch (err) {
        console.warn(
          "[revisions] add_images : relecture post-batch impossible, nettoyage R2 sauté",
          { revisionId: rev.id, productId: rev.target_id, err },
        );
        return;
      }
      const landedIds = new Set(landed.map((r) => r.id));
      const skipped = imageRows.filter((r) => !landedIds.has(r.id));
      if (skipped.length === 0) return;
      console.warn(
        "[revisions] add_images : plafond atteint entre le pré-contrôle et l'application (course avec un " +
        "chemin hors révision) — nettoyage des objets R2 écartés",
        { revisionId: rev.id, productId: rev.target_id, skippedKeys: skipped.map((s) => s.key) },
      );
      const cleanup = await Promise.allSettled(skipped.map((s) => deleteFromR2(s.key)));
      cleanup.forEach((c, i) => {
        if (c.status === "rejected") {
          console.warn("[revisions] orphan R2 object after add_images apply (plafond dépassé)", skipped[i].key, c.reason);
        }
      });
    };
  } else if (rev.kind === "remove_image") {
    const { image_id } = rev.payload as { image_id: string };
    const removal = await buildRemoveImageStatements(db, rev.target_id, current, image_id);
    extraStatements = removal.stmts;
    // Le fichier R2 n'est supprimé qu'APRÈS le commit du batch (voir plus
    // bas) : tant que la ligne `product_images` existe encore, un échec
    // avant ce point laisse une image cohérente en base et en stockage,
    // plutôt qu'une ligne supprimée pointant vers un objet qui a survécu.
    //
    // Ancré sur le `meta.changes` du DELETE FILS lui-même (`results[0]` —
    // `extraStatements` est toujours placé en tête du batch, voir la
    // construction de `stmts` plus bas, et `removal.stmts[0]` est toujours ce
    // DELETE, voir `buildRemoveImageStatements`), PAS sur celui de
    // `targetStatement` : ce sont deux écritures distinctes sur deux tables
    // distinctes, et seule celle-ci dit si la ligne a réellement disparu. Les
    // confondre est précisément ce qui a laissé une ligne supprimée pointer
    // vers un fichier détruit (ou l'inverse) tant que le DELETE, mal ordonné,
    // ne matchait plus rien alors que `targetStatement`, lui, réussissait.
    afterCommit = async (results) => {
      const deleteResult = results[0] as D1Result;
      if ((deleteResult?.meta?.changes ?? 0) === 0) return;
      await deleteFromR2(r2KeyFromImageUrl(removal.removedUrl)).catch((e) => {
        console.warn("[revisions] orphan R2 object after remove_image apply", removal.removedUrl, e);
      });
    };
  } else if (rev.kind === "set_variants") {
    const variants = await buildSetVariantsStatements(db, rev.target_id, current, rev.payload as {
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

  const markAppliedStatement =
    // `eq(status, "pending")` : ne marque `applied` que si rien n'a déjà
    // résolu cette révision entre la lecture ci-dessus et ce batch — sinon
    // une révision qu'une AUTRE application concurrente vient de passer
    // `superseded` (voir l'UPDATE ci-dessous, d'un batch gagnant) resterait
    // "applied" alors que ce batch-ci n'a en réalité rien écrit.
    db
      .update(contentRevisions)
      .set({ status: "applied", resolved_at: sql`datetime('now')`, resolved_by: actor.id })
      .where(and(eq(contentRevisions.id, rev.id), eq(contentRevisions.status, "pending")));

  const supersedeStatement =
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
      ));

  const auditStatement = db.insert(auditLog).values({
    id: nanoid(),
    actor_id: actor.id,
    actor_name: actor.name,
    action: APPLIED_ACTION,
    target_type: rev.target_type,
    target_id: rev.target_id,
    details: JSON.stringify({ via: "admin", revisionId: rev.id, kind: rev.kind }),
  });

  // `extraStatements` DOIT s'exécuter AVANT `targetStatement`, pas après.
  // Un batch D1 est une transaction SQL séquentielle : chaque instruction
  // voit les effets des précédentes. `targetStatement` avance
  // `products.updated_at` à `datetime('now')` ; si elle s'exécutait en
  // premier (ordre d'origine de la phase 2), la garde de version de CHAQUE
  // écriture enfant (`productVersionGuard`, comparée à `current` — la valeur
  // D'AVANT le bump) ne matcherait alors plus jamais rien, quelle que soit la
  // cible. Reproduit contre un vrai SQLite (voir le test
  // « [SQLITE RÉEL] » ci-dessous) : sur le chemin normal, SANS AUCUNE course,
  // `add_images` rapportait un succès sans insérer la moindre image (R2
  // orphelin pour toujours, le rejet refusant une révision déjà `applied`),
  // `remove_image` effaçait l'objet R2 sans jamais supprimer la ligne
  // (image cassée en ligne), et `set_variants` écrivait `stock_quantity` sur
  // `products` sans qu'aucune variante ne bouge (stock désynchronisé de ses
  // propres variantes — le mode de défaillance que B1 décrivait à l'origine,
  // rendu déterministe par l'inversion). C'était donc une RÉGRESSION du
  // premier correctif de B1, pas un reste : avant lui, le chemin normal
  // fonctionnait et seule une vraie course était fausse.
  //
  // Placer les enfants en tête ne casse rien de leur propre lecture de
  // `current` (ils ne touchent jamais `products` eux-mêmes) ni de celle de
  // `targetStatement`, qui lit encore la valeur non modifiée puisqu'aucune
  // des instructions qui le précèdent désormais n'écrit sur `products`.
  //
  // Indices dérivés de `extraStatements.length` (pas des constantes fixes,
  // pour rester corrects quel que soit le nombre d'écritures enfant) —
  // commentés parce qu'un tableau positionnel se décale silencieusement le
  // jour où quelqu'un insère une instruction au milieu sans les recalculer.
  const TARGET_STATEMENT_INDEX = extraStatements.length;
  const SUPERSEDE_STATEMENT_INDEX = extraStatements.length + 2;

  const stmts = [
    ...extraStatements,
    targetStatement,
    markAppliedStatement,
    supersedeStatement,
    auditStatement,
  ] as unknown as Batch;

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
    // ou non) : rien n'a été écrit sur la cible ni sur aucune de ses tables
    // filles, et le message invite à redemander une proposition fraîche
    // plutôt qu'à réessayer celle-ci. C'était vrai par construction en phase 1
    // (`targetStatement` était la SEULE écriture du batch), mais la phase 2 —
    // qui a ajouté `add_images`/`remove_image`/`set_variants`, écrivant une
    // table fille (`product_images`, `product_variants`) plutôt qu'une colonne
    // de `products` — l'avait rendu faux sans que ce commentaire ne change :
    // `insertRevisionImageStatement`, `buildRemoveImageStatements` et
    // `buildSetVariantsStatements` committaient quand même leur écriture
    // fille, alors que `targetResult.meta.changes === 0` ci-dessus prouve que
    // `targetStatement`, lui, n'avait rien changé. C'est de nouveau vrai
    // maintenant que chacune de ces écritures filles porte, elle aussi,
    // `productVersionGuard(rev.target_id, current)` — pas parce que ce
    // commentaire l'affirme, mais parce que le WHERE de chaque écriture le
    // garantit.
    throw new RevisionError("conflict", TARGET_CHANGED_MESSAGE);
  }

  // Le batch a réellement écrit la cible : `remove_image`/`add_images`
  // peuvent maintenant vérifier leur propre écriture enfant en toute
  // sécurité (voir plus haut, `results` porte le résultat positionnel de
  // CHAQUE instruction, pas seulement celui de la cible). Best-effort et hors
  // transaction — R2 n'est jamais atomique avec D1 — un échec ici est
  // journalisé, jamais renvoyé à l'appelant : l'application a déjà réussi.
  if (afterCommit) await afterCommit(results);

  // Nettoyage R2 des révisions `add_images` sœurs que CE batch vient de
  // remplacer (superseded) : `rejectRevision` libère déjà les objets R2 d'une
  // révision `add_images` REJETÉE (voir plus bas), mais une révision
  // `superseded` ne peut plus jamais être ni appliquée ni rejetée —
  // `rejectRevision` refuse tout ce qui n'est pas "pending" — donc sans ce
  // nettoyage ICI, ses objets R2 resteraient orphelins dans R2 pour toujours.
  // Deux révisions `add_images` pending sur le même produit n'est pas
  // exotique : l'écran /revisions le signale explicitement à l'administrateur.
  // `others` a été lu AVANT le batch (voir plus haut) : même approximation
  // assumée que pour `superseded: others.length` ci-dessous — une révision
  // sœur résolue par ailleurs entre cette lecture et le batch ferait au pire
  // un second appel `deleteFromR2` sur une clé déjà effacée (best-effort,
  // sans conséquence). Hors transaction, comme tout le nettoyage R2 de ce
  // fichier : un échec ici est journalisé, jamais renvoyé à l'appelant —
  // l'application a déjà réussi.
  const supersededImageKeys = others
    .filter((o) => o.kind === "add_images")
    .flatMap((o) => {
      try {
        const payload = JSON.parse(o.payload) as { images?: { key: string }[] };
        return (payload.images ?? []).map((img) => img.key);
      } catch (e) {
        console.error("[revisions] payload add_images d'une révision sœur illisible au nettoyage R2", o.id, e);
        return [];
      }
    });
  if (supersededImageKeys.length > 0) {
    const cleanup = await Promise.allSettled(supersededImageKeys.map((key) => deleteFromR2(key)));
    cleanup.forEach((c, i) => {
      if (c.status === "rejected") {
        console.warn("[revisions] orphan R2 object after supersede", supersededImageKeys[i], c.reason);
      }
    });
  }

  return { applied: true, superseded: others.length };
}

/**
 * LA suppression d'une ligne de bannière abandonnée : `is_active = 0` dans le
 * WHERE, pour ne jamais effacer une bannière qui serait, par quelque chemin,
 * devenue visible. Partagée par le rejet d'une création et par l'application
 * qui en remplace une (`applyRevision`) : deux écritures de ce prédicat
 * pourraient diverger, et c'est lui qui protège le carrousel.
 */
function deleteInactiveBannerStatement(db: DrizzleDB, bannerId: string) {
  return db.delete(banners).where(and(eq(banners.id, Number(bannerId)), eq(banners.is_active, 0)));
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

  // Cycle de vie de la ligne d'une bannière `create` : `create_banner` a
  // INSÉRÉ la ligne (inactive, vide) avant de déposer cette révision, et seule
  // l'application de la révision l'active. La rejeter sans rien faire laisserait
  // une bannière fantôme inactive dans la liste d'administration — « rejeter la
  // création » doit vouloir dire qu'elle n'existe plus.
  //
  // `is_active = 0` dans le WHERE : on ne supprime jamais une bannière qui
  // serait, par quelque chemin, devenue visible (une activation manuelle depuis
  // `/banners`, par exemple).
  //
  // Les révisions sœurs ne passent `superseded` QUE si la ligne part vraiment,
  // d'où le MÊME prédicat des deux côtés. Leur justification est que la cible
  // disparaît et que l'écran de détail d'une cible absente est un 404 qu'on ne
  // saurait plus résoudre ; quand la bannière survit, cette justification tombe,
  // et périmer un retrait que l'administrateur venait de faire déposer lui
  // ferait perdre sa décision sans qu'aucune cible ait bougé.
  //
  // ORDRE : la mise en `superseded` lit `banners` AVANT la suppression, qui suit
  // dans le même lot (D1 l'exécute séquentiellement, dans une transaction).
  // Les inverser rendrait son EXISTS toujours faux.
  //
  // Meilleur effort, comme le nettoyage R2 : le rejet est déjà acté.
  let bannerRowRemoved: boolean | undefined;
  if (rev.kind === "create" && rev.target_type === "banner") {
    try {
      const cleanup = await db.batch([
        db
          .update(contentRevisions)
          .set({ status: "superseded", resolved_at: sql`datetime('now')`, resolved_by: actor.id })
          .where(and(
            eq(contentRevisions.target_type, "banner"),
            eq(contentRevisions.target_id, rev.target_id),
            eq(contentRevisions.status, "pending"),
            ne(contentRevisions.id, rev.id),
            sql`exists (select 1 from ${banners} where ${banners.id} = ${Number(rev.target_id)} and ${banners.is_active} = 0)`,
          )),
        deleteInactiveBannerStatement(db, rev.target_id),
      ] satisfies Batch);
      bannerRowRemoved = ((cleanup[1] as D1Result)?.meta?.changes ?? 0) > 0;
    } catch (err) {
      console.error("[revisions] rejet d'une création : suppression de la ligne de bannière échouée", { revisionId: rev.id }, err);
    }
  }

  await db.insert(auditLog).values({
    id: nanoid(),
    actor_id: actor.id,
    actor_name: actor.name,
    action: REJECTED_ACTION,
    target_type: rev.target_type,
    target_id: rev.target_id,
    details: JSON.stringify({
      via: "admin",
      revisionId: rev.id,
      ...(bannerRowRemoved === undefined ? {} : { banner_row_removed: bannerRowRemoved }),
    }),
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
