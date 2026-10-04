/**
 * Clé KV du préchargement LCP du hero. Module sans import : le middleware (edge)
 * et `refreshHeroPreload` (serveur, Drizzle) la partagent sans que le premier
 * tire les dépendances du second.
 */
export const KV_HERO_PRELOAD_KEY = "hero:lcp:preload-url";

/**
 * La clé R2 derrière une valeur d'en-tête `Link` — et SEULEMENT quand elle
 * vient du chemin de repli.
 *
 * Elle sert au layout à émettre un second préchargement, `imagesrcset`, avec
 * des variantes par DPR. Cela n'a de sens que pour une image rendue par
 * React (`next/image` produit le même `srcset`) : la page demandera bien
 * l'une de ces variantes.
 *
 * Pour une COMPOSITION libre, c'est le contraire. Son `<img>` est nu et
 * demande exactement l'URL que l'auteur a posée — celle que l'en-tête `Link`
 * précharge déjà. Émettre en plus un `imagesrcset` sur d'autres variantes
 * ferait télécharger une image de plus, jamais demandée : précisément le
 * défaut que le préchargement « qui suit la composition » corrige.
 *
 * D'où la reconnaissance de la forme EXACTE du repli
 * (`width=640,quality=75`), et non d'un `format=auto` quelconque. L'URL que
 * `getCompositionImageUrl` tend aux auteurs est bâtie sur la même origine R2
 * et correspondrait à un motif plus lâche.
 */
const FORME_DU_REPLI = /^\/cdn-cgi\/image\/width=640,quality=75,format=auto\/https?:\/\/[^/]+\/(.+)$/;

export function cleDuPrechargementRepli(linkValue: string | null | undefined): string | null {
  if (!linkValue) return null;
  const url = linkValue.match(/<([^>]+)>/)?.[1];
  if (!url) return null;
  return url.match(FORME_DU_REPLI)?.[1] ?? null;
}
