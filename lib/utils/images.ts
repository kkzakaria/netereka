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

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "/images/placeholder.webp";
  const url = getPublicImageUrl(path);
  if (url) return url;
  console.warn("[getImageUrl] NEXT_PUBLIC_R2_URL not set — using /images fallback, images may not load");
  return `/images/${path}`;
}
