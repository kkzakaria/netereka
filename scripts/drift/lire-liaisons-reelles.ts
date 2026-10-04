/**
 * Ce que le WORKER porte réellement : liaisons de la version déployée, secrets
 * posés, et `vars` de `wrangler.jsonc`.
 *
 * Trois sources, parce qu'aucune n'est complète à elle seule :
 *
 *  - `wrangler versions view <id>` : la photo la plus fidèle de ce que le code
 *    déployé voit. Elle porte les D1/KV/R2/assets, les secrets ET les `vars`.
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
  return [...versions].sort(
    (a, b) => Date.parse(b.metadata?.created_on ?? "") - Date.parse(a.metadata?.created_on ?? ""),
  )[0];
}

/** `vars` déclarées dans `wrangler.jsonc`. JSONC : commentaires retirés avant analyse. */
export function varsDeWranglerJsonc(chemin: string): string[] {
  const brut = readFileSync(chemin, "utf8");
  const sansCommentaires = brut
    // Les littéraux de chaîne sont préservés : on ne retire un // ou un /* que
    // hors chaîne. Suffisant ici, et vérifié par un test sur le vrai fichier.
    .replace(/"(?:[^"\\]|\\.)*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => (m.startsWith('"') ? m : ""));
  const conf = JSON.parse(sansCommentaires) as { vars?: Record<string, unknown> };
  return Object.keys(conf.vars ?? {}).sort();
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
