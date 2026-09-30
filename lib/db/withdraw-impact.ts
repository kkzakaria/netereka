import { and, asc, count, countDistinct, eq, inArray } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import {
  banners,
  categories,
  orderItems,
  orders,
  productVariants,
  products,
  whatsappCarts,
  wishlist,
} from "@/lib/db/schema";
import { bannerClock, displayedBannerCondition } from "@/lib/db/storefront/banners";
import { MAX_CATEGORY_DEPTH, type OrderStatus } from "@/lib/db/types";
import type { RevisionTarget } from "@/lib/db/revisions";

/**
 * Conséquences MESURÉES d'un retrait (§ 2.6 du spec) — ce que l'écran d'une
 * révision `withdraw` montre à l'administrateur avant qu'il tape le nom.
 *
 * Un retrait est une absence, donc invisible par nature : l'écran ne peut pas
 * la décrire en général (« cette fiche a peut-être des commandes »), il doit la
 * compter. Chaque chiffre ci-dessous vient d'une requête sur la table qui PORTE
 * la relation — pas d'une déduction depuis la ligne visée :
 *
 * - commandes : `order_items.product_id` (la ligne de commande garde l'id du
 *   produit ; `orders` n'en porte aucun) ;
 * - paniers WhatsApp : `whatsapp_carts.product_id` (le panier web vit dans le
 *   navigateur du client, il n'est mesurable nulle part côté serveur) ;
 * - envies : `wishlist.product_id` ;
 * - catégories : la chaîne `parent_id`, parce qu'une page catégorie liste les
 *   produits de ses descendants (`getCategoryDescendantIds`, app/(storefront)/c) ;
 * - hero : `products.is_featured`, que lit `getFeaturedProducts` ;
 * - bannière : `displayedBannerCondition`, la condition même du carrousel.
 */

/** Statuts où une commande est encore en cours : le colis n'est ni livré, ni annulé, ni retourné. */
export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ["pending", "confirmed", "preparing", "shipping"];

export interface CategoryTrailItem {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface ProductWithdrawImpact {
  kind: "product";
  name: string;
  slug: string;
  is_active: boolean;
  is_draft: boolean;
  is_featured: boolean;
  /** Sa catégorie d'abord, puis ses ancêtres : chaque page catégorie qui la liste aujourd'hui. */
  category_trail: CategoryTrailItem[];
  stock_quantity: number;
  active_variant_count: number;
  /** Commandes distinctes qui la référencent, tous statuts confondus. */
  orders_total: number;
  /** Dont encore en cours (à livrer). */
  orders_open: number;
  wishlist_count: number;
  whatsapp_cart_count: number;
  /** Bannières affichées à cet instant : le hero ne montre les produits en vedette que s'il y en a 0. */
  displayed_banner_count: number;
}

export type BannerWindow = "live" | "scheduled" | "expired" | "inactive";

export interface BannerWithdrawImpact {
  kind: "banner";
  title: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  window: BannerWindow;
  /** Affichée dans le carrousel À CET INSTANT (active et dans sa fenêtre). */
  displayed_now: boolean;
  /** Rang (1-based) dans le carrousel, `null` si elle n'y figure pas. */
  position: number | null;
  displayed_total: number;
  /** Bannières restantes dans le carrousel une fois celle-ci retirée. */
  displayed_after: number;
}

export type WithdrawImpact = ProductWithdrawImpact | BannerWithdrawImpact;

/** État de la fenêtre d'affichage, comparée comme la vitrine (chaînes). Pure. */
export function bannerWindow(
  row: { is_active: boolean; starts_at: string | null; ends_at: string | null },
  now: string,
): BannerWindow {
  if (!row.is_active) return "inactive";
  if (row.starts_at && row.starts_at > now) return "scheduled";
  if (row.ends_at && row.ends_at <= now) return "expired";
  return "live";
}

async function categoryTrail(
  db: Awaited<ReturnType<typeof getDrizzle>>,
  categoryId: string | null,
): Promise<CategoryTrailItem[]> {
  const trail: CategoryTrailItem[] = [];
  const seen = new Set<string>();
  let cursor = categoryId;
  // Borné : deux niveaux de catégories au plus (MAX_CATEGORY_DEPTH), et jamais
  // de boucle sur un parent_id corrompu.
  while (cursor && !seen.has(cursor) && trail.length <= MAX_CATEGORY_DEPTH) {
    seen.add(cursor);
    const row = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        is_active: categories.is_active,
        parent_id: categories.parent_id,
      })
      .from(categories)
      .where(eq(categories.id, cursor))
      .limit(1)
      .get();
    if (!row) break;
    trail.push({ id: row.id, name: row.name, slug: row.slug, is_active: row.is_active === 1 });
    cursor = row.parent_id;
  }
  return trail;
}

export async function getProductWithdrawImpact(productId: string): Promise<ProductWithdrawImpact | null> {
  const db = await getDrizzle();
  const product = await db
    .select({
      name: products.name,
      slug: products.slug,
      is_active: products.is_active,
      is_draft: products.is_draft,
      is_featured: products.is_featured,
      category_id: products.category_id,
      stock_quantity: products.stock_quantity,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
    .get();
  if (!product) return null;

  const [trail, variants, ordersAll, ordersOpen, wished, carts, displayedBanners] = await Promise.all([
    categoryTrail(db, product.category_id),
    db
      .select({ n: count() })
      .from(productVariants)
      .where(and(eq(productVariants.product_id, productId), eq(productVariants.is_active, 1)))
      .get(),
    db
      .select({ n: countDistinct(orderItems.order_id) })
      .from(orderItems)
      .where(eq(orderItems.product_id, productId))
      .get(),
    db
      .select({ n: countDistinct(orderItems.order_id) })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.order_id))
      .where(and(eq(orderItems.product_id, productId), inArray(orders.status, [...OPEN_ORDER_STATUSES])))
      .get(),
    db.select({ n: count() }).from(wishlist).where(eq(wishlist.product_id, productId)).get(),
    db
      .select({ n: countDistinct(whatsappCarts.session_id) })
      .from(whatsappCarts)
      .where(eq(whatsappCarts.product_id, productId))
      .get(),
    // Même condition que le carrousel : le hero de repli n'existe que si elle ne renvoie rien.
    db.select({ n: count() }).from(banners).where(displayedBannerCondition(bannerClock())).get(),
  ]);

  return {
    kind: "product",
    name: product.name,
    slug: product.slug,
    is_active: product.is_active === 1,
    is_draft: product.is_draft === 1,
    is_featured: product.is_featured === 1,
    category_trail: trail,
    stock_quantity: product.stock_quantity,
    active_variant_count: variants?.n ?? 0,
    orders_total: ordersAll?.n ?? 0,
    orders_open: ordersOpen?.n ?? 0,
    wishlist_count: wished?.n ?? 0,
    whatsapp_cart_count: carts?.n ?? 0,
    displayed_banner_count: displayedBanners?.n ?? 0,
  };
}

export async function getBannerWithdrawImpact(
  bannerId: number,
  now: string = bannerClock(),
): Promise<BannerWithdrawImpact | null> {
  const db = await getDrizzle();
  const banner = await db
    .select({
      title: banners.title,
      is_active: banners.is_active,
      starts_at: banners.starts_at,
      ends_at: banners.ends_at,
    })
    .from(banners)
    .where(eq(banners.id, bannerId))
    .limit(1)
    .get();
  if (!banner) return null;

  // Même condition et même ordre que le carrousel (`getActiveBanners`).
  const displayed = await db
    .select({ id: banners.id })
    .from(banners)
    .where(displayedBannerCondition(now))
    .orderBy(asc(banners.display_order), asc(banners.id))
    .all();
  const index = displayed.findIndex((b) => b.id === bannerId);
  const displayedNow = index !== -1;

  return {
    kind: "banner",
    title: banner.title,
    is_active: banner.is_active === 1,
    starts_at: banner.starts_at,
    ends_at: banner.ends_at,
    window: bannerWindow({ ...banner, is_active: banner.is_active === 1 }, now),
    displayed_now: displayedNow,
    position: displayedNow ? index + 1 : null,
    displayed_total: displayed.length,
    displayed_after: displayed.length - (displayedNow ? 1 : 0),
  };
}

export async function getWithdrawImpact(target: RevisionTarget, targetId: string): Promise<WithdrawImpact | null> {
  if (target === "banner") {
    const id = Number(targetId);
    return Number.isInteger(id) ? getBannerWithdrawImpact(id) : null;
  }
  return getProductWithdrawImpact(targetId);
}
