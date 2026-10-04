/**
 * Ce que le WORKER porte réellement : liaisons de la version déployée, secrets
 * posés, et `vars` de `wrangler.jsonc`.
 *
 * Trois sources, parce qu'aucune n'est complète à elle seule :
 *
 *  - `wrangler versions view <id>` : la photo la plus fidèle de ce que le code
 *    déployé voit — les liaisons de la version, telles que l'API les rend.
 *    (Observé : D1/KV/R2/assets y figurent. Je n'ai pas vérifié que les
 *    secrets et les `vars` y soient TOUJOURS : les deux sources suivantes les
 *    couvrent de toute façon, et c'est pour cela qu'il y en a trois.)
 *  - `wrangler secret list` : l'état VIVANT des secrets. Un secret posé après
 *    le dernier déploiement y figure alors qu'il n'est pas encore dans la
 *    version. C'est précisément comme ça qu'un secret apparaît sans commit.
 *  - les `vars` de `wrangler.jsonc` : versionnées, donc déclaratives, mais on
 *    les compte ici comme « réelles » car Cloudflare les reconstruit à chaque
 *    déploiement depuis ce fichier.
 *
 * On ne lit JAMAIS les valeurs — seulement les noms, et le type que Cloudflare
 * annonce.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { LiaisonReelle } from "@/lib/drift/types";
import { varsDeclarees } from "@/lib/config/wrangler-jsonc";

function wrangler(args: string[]): string {
  return execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function jsonDe<T>(brut: string): T {
  const debut = brut.search(/[[{]/);
  if (debut === -1) throw new Error(`Réponse wrangler illisible :\n${brut.slice(0, 500)}`);
  return JSON.parse(brut.slice(debut)) as T;
}

interface Version { id: string; number?: number; metadata?: { created_on?: string } }
interface LiaisonVersion { name: string; type: string }

/**
 * Identifiant de la version la plus récente.
 *
 * `wrangler versions list --json` rend les versions dans l'ORDRE CROISSANT
 * (la plus ancienne d'abord). Prendre `[0]` naïvement a déjà coûté cher à ce
 * dépôt — 90 % du trafic routé vers une version vieille de deux jours. On trie
 * explicitement par date décroissante.
 */
export function versionLaPlusRecente(): Version {
  const versions = jsonDe<Version[]>(wrangler(["versions", "list", "--json"]));
  if (versions.length === 0) throw new Error("Aucune version de Worker listée.");

  // Une date illisible fait LEVER, au lieu de se glisser dans le tri.
  // `Date.parse("")` rend NaN, toute comparaison avec NaN rend false, et le
  // tri laisse alors l'ordre d'origine — croissant — donc `[0]` serait la
  // PLUS ANCIENNE version. On comparerait la réalité d'il y a des semaines
  // en croyant lire celle d'aujourd'hui : le garde-fou mentirait sans
  // trembler. C'est exactement le piège que « `.[0]` naïf » nous a déjà
  // coûté une fois sur `deployments list` (voir CLAUDE.md).
  const datees = versions.map((v) => {
    const t = Date.parse(v.metadata?.created_on ?? "");
    if (Number.isNaN(t)) {
      throw new Error(
        `[dérive] version ${v.id?.slice(0, 8) ?? "?"} sans date lisible (created_on = ${JSON.stringify(v.metadata?.created_on)}).`,
      );
    }
    return { v, t };
  });
  return datees.sort((a, b) => b.t - a.t)[0].v;
}

/**
 * `vars` déclarées dans `wrangler.jsonc`.
 *
 * Le retrait des commentaires vit dans `lib/config/wrangler-jsonc.ts` depuis
 * que `scripts/observer-version.ts` lit le même fichier pour le nom du
 * Worker : deux copies d'un tel retrait, c'est deux occasions d'en avoir une
 * qui mange une chaîne.
 */
export function varsDeWranglerJsonc(chemin: string): string[] {
  return varsDeclarees(readFileSync(chemin, "utf8"));
}

/**
 * La FORME de `wrangler secret list`, vérifiée — parce que c'est ici que le
 * garde-fou peut devenir VERT À TORT.
 *
 * Le sens qui vaut le coup, « présent dans la réalité, déclaré nulle part »,
 * ne se voit que si l'énumération est complète. Une sortie dont le champ
 * `name` serait renommé donnerait des entrées `undefined` : les secrets en
 * trop disparaîtraient du rapport, les liaisons REQUISES resteraient
 * satisfaites par la version déployée, et le contrôle passerait au vert en
 * ayant cessé de regarder. Une panne bruyante (sortie 2) vaut mieux qu'un
 * silence rassurant.
 */
export function validerSecrets(secrets: unknown): asserts secrets is { name: string; type: string }[] {
  if (!Array.isArray(secrets)) {
    throw new Error("[dérive] `wrangler secret list` n'a pas rendu une liste — forme inattendue.");
  }
  // Une liste VIDE n'est pas un état légitime ici : ce Worker ne démarre pas
  // sans `BETTER_AUTH_SECRET`, et la réponse est de toute façon en ligne.
  // Zéro secret signifie donc qu'on ne LIT plus, pas qu'il n'y en a plus — et
  // une lecture aveugle laisse passer tout le sens « présent dans la réalité,
  // déclaré nulle part », qui est la raison d'être de ce contrôle.
  if (secrets.length === 0) {
    throw new Error(
      "[dérive] `wrangler secret list` n'a rendu AUCUN secret. Le Worker en porte nécessairement " +
        "(BETTER_AUTH_SECRET au minimum) : c'est la lecture qui a échoué, pas la réalité qui s'est vidée.",
    );
  }
  for (const s of secrets) {
    if (!s || typeof (s as { name?: unknown }).name !== "string" || !(s as { name: string }).name) {
      throw new Error(
        `[dérive] une entrée de \`wrangler secret list\` ne porte pas de \`name\` lisible : ${JSON.stringify(s)}`,
      );
    }
  }
}

export interface LiaisonsReelles {
  liaisons: LiaisonReelle[];
  versionId: string;
  versionDate: string;
}

export function lireLiaisonsReelles(cheminWranglerJsonc: string): LiaisonsReelles {
  const version = versionLaPlusRecente();
  const detail = jsonDe<{ resources?: { bindings?: LiaisonVersion[] } }>(
    wrangler(["versions", "view", version.id, "--json"]),
  );
  const parNom = new Map<string, LiaisonReelle>();

  for (const b of detail.resources?.bindings ?? []) {
    parNom.set(b.name, { nom: b.name, type: b.type, source: `version déployée ${version.id.slice(0, 8)}` });
  }

  const secrets = jsonDe<{ name: string; type: string }[]>(wrangler(["secret", "list"]));
  validerSecrets(secrets);

  for (const s of secrets) {
    const existante = parNom.get(s.name);
    if (existante) {
      existante.source = `${existante.source} + wrangler secret list`;
    } else {
      // Posé après le dernier déploiement : pas encore dans la version, mais
      // bien réel. C'est le cas qui échappe à toute relecture de commit.
      parNom.set(s.name, { nom: s.name, type: s.type, source: "wrangler secret list (absent de la version déployée)" });
    }
  }

  for (const v of varsDeWranglerJsonc(cheminWranglerJsonc)) {
    const existante = parNom.get(v);
    if (existante) {
      existante.source = `${existante.source} + wrangler.jsonc`;
    } else {
      parNom.set(v, { nom: v, type: "plain_text", source: "wrangler.jsonc (absent de la version déployée)" });
    }
  }

  return {
    liaisons: [...parNom.values()].sort((a, b) => a.nom.localeCompare(b.nom)),
    versionId: version.id,
    versionDate: version.metadata?.created_on ?? "date inconnue",
  };
}
