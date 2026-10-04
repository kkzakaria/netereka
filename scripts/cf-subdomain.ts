#!/usr/bin/env tsx
/**
 * Appliquer les réglages `workers_dev` et `preview_urls` de `wrangler.jsonc`
 * au Worker déployé.
 *
 * POURQUOI UN SCRIPT, ALORS QUE C'EST DANS wrangler.jsonc.
 *
 * Parce que notre chaîne de livraison ne les applique jamais. Le POST qui
 * allume ou éteint le sous-domaine vit dans une seule fonction de wrangler,
 * `subdomainDeploy`, appelée par `triggersDeploy`, lui-même appelé par
 * exactement deux commandes : `wrangler deploy` et `wrangler triggers deploy`
 * (vérifié dans la source de wrangler 4.146.0). Or `deploy.yml`,
 * `promote.yml` et `rollback.yml` n'utilisent que `versions upload`,
 * `versions deploy` et `rollback` — aucune des deux. `versions upload` se
 * contente de LIRE l'état du sous-domaine pour imprimer l'URL d'aperçu.
 *
 * Écrire `"workers_dev": false` dans le fichier était donc une déclaration
 * d'intention sans effet, et la documenter comme un fait aurait été pire que
 * la porte ouverte : une posture fausse arrête ceux qui auraient regardé.
 *
 * Même famille que `scripts/version-affinity.mjs` : un réglage Cloudflare que
 * le dépôt décrit et qu'aucun workflow n'applique, donc un script idempotent
 * qu'on relance.
 *
 * Usage :
 *   npm run cf:subdomain [-- --dry-run]
 *
 * Aucune variable d'environnement n'est nécessaire si `wrangler` est
 * authentifié : son jeton OAuth porte `workers_scripts:write`, qui suffit ici,
 * et `scripts/lib/identifiants-cloudflare.ts` le renouvelle avant de le lire.
 * `CLOUDFLARE_API_TOKEN` (Account → Workers Scripts → Edit) reste prioritaire,
 * pour la CI.
 */


import { readFileSync } from "node:fs";
import { nomDuWorker, analyserWranglerJsonc } from "@/lib/config/wrangler-jsonc";
import { identifiantsCloudflare } from "./lib/identifiants-cloudflare";

const API = "https://api.cloudflare.com/client/v4";

interface ReglagesSousDomaine {
  enabled: boolean;
  previews_enabled: boolean;
}

/**
 * Les deux réglages, EXIGÉS explicites.
 *
 * Absents du fichier, ils n'ont pas de défaut qu'on puisse deviner : depuis
 * wrangler 4.44 `preview_urls` suit `workers_dev`, et avant il valait vrai.
 * Plutôt que de reproduire cette histoire, on demande au fichier de trancher
 * — c'est tout l'intérêt de les y avoir écrits.
 */
export function reglagesVoulus(conf: Record<string, unknown>): ReglagesSousDomaine {
  for (const cle of ["workers_dev", "preview_urls"]) {
    if (typeof conf[cle] !== "boolean") {
      throw new Error(`\`${cle}\` doit être un booléen explicite dans wrangler.jsonc.`);
    }
  }
  return {
    enabled: conf.workers_dev as boolean,
    previews_enabled: conf.preview_urls as boolean,
  };
}

/** Deux états du sous-domaine sont-ils identiques sur ce qui nous intéresse ? */
export function dejaConforme(actuel: ReglagesSousDomaine, voulu: ReglagesSousDomaine): boolean {
  return actuel.enabled === voulu.enabled && actuel.previews_enabled === voulu.previews_enabled;
}

async function main(): Promise<number> {
  const dryRun = process.argv.includes("--dry-run");

  const brut = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const nom = nomDuWorker(brut);
  const voulu = reglagesVoulus(analyserWranglerJsonc<Record<string, unknown>>(brut));

  const { jeton, compte, source } = identifiantsCloudflare({
    porteesWrangler: ["workers_scripts:write"],
    droitsApiRequis: "Account → Workers Scripts → Edit",
  });

  async function cf(methode: string, chemin: string, corps?: unknown) {
    const reponse = await fetch(`${API}${chemin}`, {
      method: methode,
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    const json = (await reponse.json()) as {
      success: boolean;
      errors?: unknown;
      result: ReglagesSousDomaine;
    };
    if (!json.success) throw new Error(`${methode} ${chemin} : ${JSON.stringify(json.errors)}`);
    return json.result;
  }

  const chemin = `/accounts/${compte}/workers/scripts/${nom}/subdomain`;
  const actuel = await cf("GET", chemin);
  console.log(`Worker « ${nom} » — authentification : ${source}`);
  console.log(`  actuel : enabled=${actuel.enabled}  previews_enabled=${actuel.previews_enabled}`);
  console.log(`  voulu  : enabled=${voulu.enabled}  previews_enabled=${voulu.previews_enabled}`);

  if (dejaConforme(actuel, voulu)) {
    console.log("✓ déjà conforme, rien à faire.");
    return 0;
  }
  if (dryRun) {
    console.log("(--dry-run : rien n'a été modifié)");
    return 0;
  }

  await cf("POST", chemin, voulu);

  // On RELIT au lieu de croire la réponse du POST : c'est le seul moyen de
  // savoir que le réglage a pris, et toute cette affaire est née d'un réglage
  // qu'on croyait appliqué et qui ne l'était pas.
  const apres = await cf("GET", chemin);
  if (!dejaConforme(apres, voulu)) {
    console.error(`✗ relecture après écriture : ${JSON.stringify(apres)}`);
    return 1;
  }
  console.log("✓ appliqué et relu.");
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((e: unknown) => {
    console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  });
