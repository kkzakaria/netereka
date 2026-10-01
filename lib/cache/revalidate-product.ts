import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@/lib/db/drizzle";
import { categories, products } from "@/lib/db/schema";

/**
 * Les pages de la vitrine qu'un changement de visibilité d'un produit rend
 * fausses : sa page, l'accueil (vedette, « Meilleures ventes », hero de repli)
 * et chaque page catégorie qui le liste — la sienne ET celles de ses parents,
 * qui listent leurs descendants (`getCategoryDescendantIds`).
 *
 * Écrit une seule fois pour les chemins qui changent la visibilité d'un produit :
 * l'application d'une révision (publish, withdraw, reactivate), la bascule
 * directe de la liste des produits, et le formulaire d'édition (`updateProduct`,
 * qui écrit `is_active` depuis le formulaire).
 *
 * CE QUE CECI NE GARANTIT PAS, aujourd'hui. Mesuré sur un build de cette branche :
 * `dynamicRoutes` est vide dans `.next/prerender-manifest.json` et toute la vitrine
 * est rendue dynamiquement (`ƒ`), y compris `/p/[slug]` malgré son
 * `export const revalidate = 3600` — parce que le layout vitrine fait
 * `await headers()` pour le hero (`app/(storefront)/layout.tsx:18`), ce qui écarte
 * du rendu statique tout son sous-arbre. Il n'y a donc RIEN en cache à invalider :
 * ces appels sont sans effet observable, et aucun client n'a jamais pu voir de page
 * périmée. On les garde par symétrie et pour le jour où la vitrine redeviendrait
 * cacheable ; ce n'est pas une garantie actuelle, et beaucoup d'autres écrivains de
 * `is_active`/`stock_quantity` ne les appellent pas (suppression d'une fiche,
 * variantes, décrément de stock d'une commande, et le Worker WhatsApp qui ne peut
 * structurellement pas appeler `next/cache`). Ne recâblez rien sur la foi de cet
 * en-tête : vérifiez d'abord que la vitrine est redevenue cacheable.
 *
 * Renvoie une liste vide si le produit n'existe pas. Dans l'ordre : page,
 * accueil, catégorie de la fiche, puis ses ancêtres.
 */
export async function productStorefrontPaths(productId: string): Promise<string[]> {
  const db = await getDrizzle();
  const row = await db
    .select({ slug: products.slug, category_id: products.category_id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
    .get();
  if (!row) return [];

  const paths = [`/p/${row.slug}`, "/"];
  let cursor: string | null = row.category_id;
  // Deux niveaux au plus (MAX_CATEGORY_DEPTH) : la borne évite toute boucle sur un parent_id corrompu.
  for (let depth = 0; cursor && depth < 4; depth++) {
    const cat: { slug: string; parent_id: string | null } | undefined = await db
      .select({ slug: categories.slug, parent_id: categories.parent_id })
      .from(categories)
      .where(eq(categories.id, cursor))
      .limit(1)
      .get();
    if (!cat) break;
    paths.push(`/c/${cat.slug}`);
    cursor = cat.parent_id;
  }
  return paths;
}

/**
 * Revalide ces pages. Meilleur effort : le changement de visibilité est déjà
 * écrit, une lecture qui échoue ne doit pas se faire passer pour un échec de
 * l'écriture (voir `applyRevisionAction`).
 */
export async function revalidateProductStorefront(productId: string): Promise<void> {
  try {
    for (const path of await productStorefrontPaths(productId)) revalidatePath(path);
  } catch (error) {
    console.error("[revalidate-product] lecture des pages à revalider échouée", { productId }, error);
  }
}
