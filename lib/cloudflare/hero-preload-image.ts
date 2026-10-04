/**
 * Quelle image le navigateur va RÉELLEMENT charger en premier sur le hero.
 *
 * Pur, sans I/O : `hero-preload.ts` tire Drizzle et KV, et cette décision doit
 * pouvoir être éprouvée sans eux.
 *
 * Pourquoi ce module existe. Depuis que la diapositive accueille une
 * composition libre, l'image d'une bannière n'est plus rendue par React : elle
 * vit dans le `content_html`, écrite par son auteur. Le préchargement, lui,
 * déduisait son URL de la colonne `image_url` et lui appliquait la
 * transformation `/cdn-cgi/image/width=640…`. Deux adresses pour la même image :
 * l'une préchargée et jamais demandée, l'autre demandée et jamais préchargée.
 * Le coût tombe entièrement sur le LCP de la page d'accueil.
 *
 * La correction ne consiste pas à aligner l'auteur sur le préchargement, mais
 * l'inverse : on précharge ce que la composition désigne. Les deux s'accordent
 * alors par construction, et non par convention — une convention que personne
 * ne pourrait faire respecter à du HTML libre.
 */

/**
 * La PREMIÈRE image du document, pas la plus grande.
 *
 * Le LCP est le plus souvent la plus grande, mais rien ici ne connaît les
 * dimensions rendues : `width`/`height` sont facultatifs, une classe peut tout
 * redimensionner, et un `<style>` d'auteur davantage encore. « La première »
 * est un choix prévisible, que l'auteur contrôle en plaçant son visuel
 * principal en tête — ce qu'une composition fait naturellement.
 *
 * Le HTML est DÉJÀ assaini quand il arrive ici (à l'écriture, puis par
 * `getActiveBanners`), donc chaque `src` a passé `isSafeUri`. Cette fonction ne
 * rattrape pas la sécurité, elle lit.
 */
/** Les cinq entités que l'assainisseur peut laisser dans un attribut. */
function decodeEntites(valeur: string): string {
  return valeur
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#(?:39|x27);/g, "'");
}

export function premiereImageDuContenu(html: string | null | undefined): string | null {
  if (!html) return null;

  // Les attributs d'une balise n'ont pas d'ordre : on isole la balise, puis on
  // y cherche `src`. Chercher `<img[^>]*src=` dans un seul motif marcherait
  // aussi, mais échouerait sur un `src` précédé d'un attribut contenant « > »
  // — impossible après assainissement, et on ne s'appuie pas là-dessus.
  const balises = html.match(/<img\b[^>]*>/gi);
  if (!balises) return null;

  for (const balise of balises) {
    const m = balise.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const src = (m?.[1] ?? m?.[2] ?? "").trim();
    if (!src) continue;
    // Une data URI est déjà dans le document : la précharger ne ferait que
    // dupliquer des octets déjà téléchargés avec le HTML.
    if (/^data:/i.test(src)) continue;
    // Les entités d'un attribut HTML ne font pas partie de l'URL : un
    // `src="…?a=1&amp;b=2"` est demandé par le navigateur comme `&`. Les
    // laisser ferait précharger une adresse que la page ne demande jamais —
    // un préchargement perdu, et la divergence que ce module existe pour
    // fermer. Nos propres URL (/cdn-cgi/image/…) n'en portent pas ; celle
    // d'un auteur, oui.
    return decodeEntites(src);
  }
  return null;
}
