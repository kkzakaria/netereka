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
 * qui écrit `is_active` depuis le formulaire). Un chemin qui change `is_active`
 * sans appeler ceci laisse la vitrine sur l'ancienne page jusqu'à l'expiration
 * de l'ISR : à vérifier pour tout nouveau chemin d'écriture.
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
