import { getR2 } from "@/lib/cloudflare/context";

export async function uploadToR2(
  file: File,
  key: string
): Promise<string> {
  const r2 = await getR2();
  if (!r2) {
    throw new Error("R2 bucket non disponible. Vérifiez la configuration Cloudflare.");
  }
  const buffer = await file.arrayBuffer();
  await r2.put(key, buffer, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  return key;
}

/**
 * Lit un objet R2 déjà en place, pour le réenvoyer à un service externe.
 *
 * Utilisé par `generate_product_image` (lib/mcp/tools/images.ts) : la source
 * de l'édition est la photo réelle du produit, et on la lit par le binding R2
 * plutôt que par son URL publique. Deux raisons :
 *
 * - l'URL publique dépend de `NEXT_PUBLIC_R2_URL`, une variable de BUILD
 *   absente en local — la génération y serait intestable, et `getImageUrl`
 *   rendrait un chemin relatif inutilisable comme URL externe ;
 * - lire par le binding ne sort pas du réseau Cloudflare et n'expose aucune
 *   nouvelle surface de requête sortante.
 *
 * `null` quand l'objet n'existe pas : une ligne `product_images` sans son
 * objet R2 est un cas réel (nettoyage partiel), et l'appelant doit pouvoir le
 * dire plutôt que de lever.
 */
export async function readFromR2(
  key: string
): Promise<{ bytes: Uint8Array; contentType: string | null } | null> {
  const r2 = await getR2();
  if (!r2) {
    throw new Error("R2 bucket non disponible. Vérifiez la configuration Cloudflare.");
  }
  const object = await r2.get(key);
  if (!object) return null;
  const buffer = await object.arrayBuffer();
  return { bytes: new Uint8Array(buffer), contentType: object.httpMetadata?.contentType ?? null };
}

export async function deleteFromR2(key: string): Promise<void> {
  const r2 = await getR2();
  if (!r2) {
    throw new Error("R2 bucket non disponible. Vérifiez la configuration Cloudflare.");
  }
  await r2.delete(key);
}
