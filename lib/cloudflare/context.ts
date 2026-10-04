import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifierLiaisonsUneFois } from "@/lib/drift/au-demarrage";

/**
 * Point de passage unique vers l'environnement du Worker — et donc le seul
 * endroit d'où une vérification de dérive des liaisons voit à la fois ce que le
 * code déclare et ce que l'isolat porte réellement.
 *
 * Pourquoi ici plutôt qu'ailleurs :
 *
 *  - `instrumentation.ts` de Next serait l'endroit canonique « au démarrage »,
 *    mais il n'existe pas dans ce dépôt et, sous OpenNext, son `register()` ne
 *    s'exécute pas dans un contexte de requête : `getCloudflareContext()` n'y
 *    rend pas d'`env` fiable. Un garde-fou qui ne voit rien ne garde rien.
 *  - `middleware.ts` ne touche à `env` que sur `/`. Un isolat qui ne sert
 *    jamais la page d'accueil ne serait jamais vérifié.
 *  - Ce module-ci est importé par tout ce qui lit la base, le KV ou R2,
 *    c'est-à-dire par la quasi-totalité du rendu. L'isolat est donc vérifié
 *    tôt, sur sa première requête utile.
 *
 * Coût par requête : une lecture de symbole sur `globalThis` après le premier
 * appel. La vérification elle-même est un `Object.keys(env)` et une comparaison
 * de deux listes d'une vingtaine de noms, une seule fois par isolat.
 */
async function environnementVerifie() {
  const { env } = await getCloudflareContext();
  verifierLiaisonsUneFois(env);
  return env;
}

export async function getEnv() {
  return environnementVerifie();
}

export async function getDB() {
  return (await environnementVerifie()).DB;
}

export async function getKV() {
  return (await environnementVerifie()).KV;
}

export async function getR2() {
  return (await environnementVerifie()).R2;
}
