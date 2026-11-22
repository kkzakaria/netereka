/**
 * Pagination SEO des listes de produits (catégories).
 *
 * Avant : le bouton « Charger plus » n'était qu'un <button> JavaScript et
 * `?page=N` déclarait la page 1 comme canonique. Résultat, au-delà des 20
 * premiers produits d'une catégorie, Google ne trouvait les fiches que par le
 * sitemap, sans aucun lien interne, et ignorait le contenu des pages N > 1.
 *
 * Maintenant : chaque page N a son propre canonical (recommandation Google
 * pour la pagination), et « Charger plus » est un vrai lien vers `?page=N+1`,
 * amélioré en JavaScript.
 */

/** Paramètres qui changent la LISTE (pas seulement l'ordre). */
const FILTER_PARAMS = ["brand", "min_price", "max_price"] as const;

export interface ListingParams {
  brand?: string;
  min_price?: string;
  max_price?: string;
  sort?: string;
  page?: string;
}

/** Numéro de page normalisé : entier ≥ 1, toute valeur invalide → 1. */
export function parsePage(raw: string | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function hasFilters(params: ListingParams): boolean {
  return FILTER_PARAMS.some((k) => Boolean(params[k]));
}

/**
 * Canonical d'une page de catégorie.
 * - Page filtrée (marque, prix) → la catégorie nue : un filtre n'est pas une
 *   page à indexer, et ses pages suivantes non plus.
 * - Page N > 1 sans filtre → elle-même (`?page=N`).
 * - Sinon → la catégorie nue.
 * Le tri seul ne change pas le canonical ; il passe la page en noindex.
 */
export function categoryCanonical(slug: string, params: ListingParams): string {
  const base = `/c/${slug}`;
  if (hasFilters(params)) return base;
  const page = parsePage(params.page);
  return page > 1 ? `${base}?page=${page}` : base;
}

/**
 * Lien vers une page donnée, en conservant filtres et tri : un visiteur sans
 * JavaScript qui clique « Charger plus » doit voir la suite de SA liste.
 * La page 1 n'a pas de `?page=`.
 */
export function listingPageHref(basePath: string, params: ListingParams, page: number): string {
  const qs = new URLSearchParams();
  for (const k of [...FILTER_PARAMS, "sort"] as const) {
    const v = params[k];
    if (v) qs.set(k, v);
  }
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}
