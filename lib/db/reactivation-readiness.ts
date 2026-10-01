import { and, count, eq, sql } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { productImages, productVariants, products } from "@/lib/db/schema";

/**
 * Ce qui rend une fiche impropre à la vitrine, MESURÉ au moment de l'affichage
 * de l'écran d'une remise en ligne (§ 2.6 bis) — jamais stocké dans la révision,
 * que le réassort ou un téléversement d'image périmeraient.
 *
 * Chaque chiffre vient de la table qui PORTE la donnée, celle que lit la vitrine :
 *
 * - images : `product_images` (la page liste toutes les lignes ; les cartes de
 *   catégorie et de recherche ne lisent que `is_primary = 1`, voir
 *   `lib/db/products.ts`) ;
 * - stock : DEUX sources, parce que le client n'en voit qu'une à la fois. La page
 *   lit `products.stock_quantity` (« rupture ») ; mais dès qu'une fiche a des
 *   variantes actives, le paiement ne regarde QUE le stock de la variante
 *   choisie (`resolveOrderLine`, lib/utils/checkout.ts) et refuse une commande
 *   sans variante. `products.stock_quantity` n'est alors qu'un total tenu à la
 *   main : en production il diverge de la somme des variantes sur 42 fiches, dont
 *   des fiches à 99 ou 999 unités dont toutes les variantes sont à zéro. Lire
 *   seulement `products.stock_quantity` déclarerait « en stock » ce qu'aucun
 *   client ne peut acheter ;
 * - description : `products.description`.
 */
export interface ReactivationReadiness {
  name: string;
  slug: string;
  is_active: boolean;
  is_draft: boolean;
  /** Lignes de `product_images` : ce que montre la page du produit. */
  image_count: number;
  /** Une image `is_primary` : la seule que lisent les cartes (catégories, recherche, accueil). */
  has_primary_image: boolean;
  /** `products.stock_quantity` : ce que la page affiche (« rupture » à 0). */
  product_stock: number;
  active_variant_count: number;
  /** Somme du stock des variantes ACTIVES (0 sans variante) : ce que le paiement vérifie dès qu'il y en a. */
  active_variant_stock: number;
  /** Texte brut de `products.description`, que `reactivation-reading` juge vide ou non. */
  description: string | null;
}

export async function getReactivationReadiness(productId: string): Promise<ReactivationReadiness | null> {
  const db = await getDrizzle();
  const product = await db
    .select({
      name: products.name,
      slug: products.slug,
      is_active: products.is_active,
      is_draft: products.is_draft,
      stock_quantity: products.stock_quantity,
      description: products.description,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
    .get();
  if (!product) return null;

  const [images, primaries, variants] = await Promise.all([
    db.select({ n: count() }).from(productImages).where(eq(productImages.product_id, productId)).get(),
    db
      .select({ n: count() })
      .from(productImages)
      .where(and(eq(productImages.product_id, productId), eq(productImages.is_primary, 1)))
      .get(),
    db
      .select({ n: count(), stock: sql<number>`coalesce(sum(${productVariants.stock_quantity}), 0)` })
      .from(productVariants)
      .where(and(eq(productVariants.product_id, productId), eq(productVariants.is_active, 1)))
      .get(),
  ]);

  return {
    name: product.name,
    slug: product.slug,
    is_active: product.is_active === 1,
    is_draft: product.is_draft === 1,
    image_count: images?.n ?? 0,
    has_primary_image: (primaries?.n ?? 0) > 0,
    product_stock: product.stock_quantity,
    active_variant_count: variants?.n ?? 0,
    active_variant_stock: Number(variants?.stock ?? 0),
    description: product.description,
  };
}
