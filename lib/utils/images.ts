/**
 * URL publique d'une clé de stockage, ou `null` quand elle n'est pas
 * adressable. Contrairement à `getImageUrl`, ne fabrique AUCUN repli.
 *
 * Destiné aux appelants qui TRANSMETTENT l'URL à un tiers plutôt que de la
 * poser eux-mêmes dans un `src` — les outils MCP, notamment : pour eux, le
 * repli `/images/<clé>` de `getImageUrl` est pire qu'une absence, puisqu'il
 * ressemble à une URL valide alors qu'il ne mène à rien. `NEXT_PUBLIC_R2_URL`
 * est une variable de BUILD : si elle manque, aucune URL ne peut être devinée,
 * et le dire est la seule réponse honnête.
 */
export function getPublicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_R2_URL;
  if (!base) return null;
  return `${base}/${path}`;
}

/**
 * Largeur de transformation par défaut d'une image de composition libre.
 *
 * Elle vient de la LARGEUR de la diapositive, pas de sa hauteur : le hero
 * occupe toute la largeur du carrousel (au plus ~1280 px), et une composition
 * peut y poser une image pleine largeur. Une image placée dans un `nk-split`
 * n'en occupe que la moitié et se contenterait de 828 px — l'appelant peut
 * passer sa propre largeur, mais aucun outil MCP ne l'expose aujourd'hui.
 *
 * Le préchargement n'a pas de `srcset` (voir `refreshHeroPreload`, limite des
 * Early Hints de Cloudflare) : c'est donc UNE adresse pour tous les écrans, et
 * un mobile télécharge la variante large. Mesuré, l'écart reste modeste —
 * 67 111 octets en 1280 contre 23 046 en 640, là où l'adresse brute en coûte
 * 1 484 141.
 */
const COMPOSITION_WIDTH = 1280;

/**
 * L'URL à POSER dans un `src`, redimensionnée et réencodée par Cloudflare.
 *
 * `getPublicImageUrl` rend l'adresse BRUTE de l'objet R2. Elle est correcte
 * et ruineuse : mesuré le 2026-10-04 sur une bannière de production,
 * `banners/7-eMbgtwky.png` pèse **1 484 141 octets** servie telle quelle,
 * contre **67 111** en `width=1280,quality=75,format=auto` et 23 046 en
 * `width=640`. Vingt-deux fois plus lourd pour la même image, sur une
 * boutique mobile-first où la donnée se paie.
 *
 * React passait déjà par cette transformation (`cloudflareImageLoader`) pour
 * les images qu'il rend. Une composition libre, elle, écrit un `<img>` nu :
 * si on lui tend l'URL brute, c'est elle qui part en ligne. On lui tend donc
 * l'URL transformée, et le préchargement — qui lit le `src` de la composition
 * — préchargera la même.
 *
 * Deux cas rendent l'adresse BRUTE, à dessein :
 * - un `.avif`, que le redimensionneur refuse sur ce plan (« ERROR 9520 », même
 *   motif que `cloudflareImageLoader`) : brut s'affiche, transformé ne
 *   s'affiche pas ;
 * - le développement, où `/cdn-cgi/image/` n'existe pas.
 */
export function getCompositionImageUrl(
  path: string | null | undefined,
  width: number = COMPOSITION_WIDTH,
): string | null {
  const url = getPublicImageUrl(path);
  if (!url) return null;
  if (/\.avif(\?|#|$)/i.test(url)) return url;
  if (process.env.NODE_ENV === "development") return url;
  const sansSlash = url.startsWith("/") ? url.slice(1) : url;
  // `quality=75` comme `cloudflareImageLoader` et comme le repli du
  // préchargement : une seconde valeur n'aurait servi qu'à faire deux
  // variantes de la même image là où une suffit.
  return `/cdn-cgi/image/width=${width},quality=75,format=auto/${sansSlash}`;
}

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "/images/placeholder.webp";
  const url = getPublicImageUrl(path);
  if (url) return url;
  console.warn("[getImageUrl] NEXT_PUBLIC_R2_URL not set — using /images fallback, images may not load");
  return `/images/${path}`;
}
