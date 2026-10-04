/**
 * Lire `wrangler.jsonc` — c'est-à-dire du JSON **avec commentaires**, que
 * `JSON.parse` refuse.
 *
 * Extrait du collecteur de dérive, qui portait cette analyse en propre, le
 * jour où `scripts/observer-version.ts` a eu besoin du même fichier pour une
 * autre raison : le NOM du Worker. Deux copies d'un retrait de commentaires,
 * c'est deux occasions d'en avoir une qui mange une chaîne.
 *
 * Prend le CONTENU, pas un chemin : la fonction reste pure, donc testable sur
 * des cas tordus construits à la main, et pas seulement sur le fichier réel
 * du dépôt.
 */

/**
 * Retire les commentaires `//` et les blocs sans toucher à ce qui est DANS une
 * chaîne. L'alternance commence par le motif de chaîne, donc une occurrence
 * de `//` ou de `/*` à l'intérieur de guillemets est capturée comme chaîne et
 * rendue telle quelle — c'est ce qui sauve les URL (`https://…`) et les
 * chemins que ce fichier contient.
 */
export function sansCommentaires(jsonc: string): string {
  return jsonc.replace(/"(?:[^"\\]|\\.)*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
    m.startsWith('"') ? m : "",
  );
}

export function analyserWranglerJsonc<T = Record<string, unknown>>(contenu: string): T {
  return JSON.parse(sansCommentaires(contenu)) as T;
}

/**
 * Le nom du Worker, tel que Cloudflare le connaît.
 *
 * Il sert à fabriquer `Cloudflare-Workers-Version-Overrides`, dont la clé EST
 * ce nom. Le coder en dur serait une quatrième façon d'être silencieusement
 * ignoré : le jour d'un renommage, l'en-tête désignerait un Worker qui
 * n'existe pas, Cloudflare l'ignorerait, et l'observation porterait sur une
 * autre version sans que rien ne le dise. On LÈVE donc si le nom manque,
 * plutôt que de rendre une chaîne vide qui produirait exactement cela.
 */
export function nomDuWorker(contenu: string): string {
  const nom = analyserWranglerJsonc<{ name?: unknown }>(contenu).name;
  if (typeof nom !== "string" || nom.length === 0) {
    throw new Error("`name` absent de wrangler.jsonc — le nom du Worker est introuvable.");
  }
  return nom;
}

/** Les `vars` déclarées, triées. */
export function varsDeclarees(contenu: string): string[] {
  const conf = analyserWranglerJsonc<{ vars?: Record<string, unknown> }>(contenu);
  return Object.keys(conf.vars ?? {}).sort();
}
