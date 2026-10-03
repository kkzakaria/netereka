export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (src.startsWith("blob:") || src.startsWith("data:")) return src;

  // Un AVIF est servi TEL QUEL, sans passer par le redimensionneur.
  //
  // Cloudflare ne lit l'AVIF en entrée que sur un plan Enterprise : sur
  // celui-ci, `/cdn-cgi/image/…` répond « ERROR 9520 » et l'image ne s'affiche
  // pas du tout. Les navigateurs, eux, lisent l'AVIF nativement depuis des
  // années — le fichier n'a jamais eu de problème, c'est notre tuyau qui ne
  // sait pas le relayer.
  //
  // 48 images stockées sur 29 fiches sont dans ce cas, héritées d'une période
  // où le téléchargement MCP réclamait l'AVIF dans son en-tête `Accept` et où
  // le téléversement d'administration acceptait tout `image/*`. Les deux portes
  // sont fermées (lib/storage/fetch-image.ts, actions/admin/images.ts), mais
  // ces 48-là existent et doivent s'afficher.
  //
  // Ce qu'on y perd : elles sortent à leur taille d'origine, sans
  // redimensionnement ni `format=auto`. C'est de la bande passante — contre
  // une image qui, aujourd'hui, ne s'affiche pas du tout. L'échange est net.
  //
  // Ce repli reste utile même à zéro AVIF en base : il garantit qu'un format
  // que le redimensionneur refuse dégrade l'affichage au lieu de le supprimer.
  if (/\.avif(\?|#|$)/i.test(src)) return src;

  if (process.env.NODE_ENV === "development") {
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}w=${width}`;
  }

  const params = `width=${width},quality=${quality ?? 75},format=auto`;
  const path = src.startsWith("/") ? src.slice(1) : src;
  return `/cdn-cgi/image/${params}/${path}`;
}
