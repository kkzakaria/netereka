#!/usr/bin/env tsx
/**
 * Observer une version précise du Worker, sur le vrai domaine.
 *
 *   npm run observe                      # que sert-on en ce moment ?
 *   npm run observe -- a232f5a           # par sha git, préfixe d'UUID ou UUID
 *   npm run observe -- a232f5a --verifier
 *   npm run observe -- a232f5a --chemin /apercu/banniere/42
 *
 * Ce fichier n'est que l'enveloppe : toute la logique — résolution d'une
 * référence, validité de l'en-tête, applicabilité, verdict — vit dans
 * `lib/release/observation.ts`, qui est pur et testé. Ici il n'y a que des
 * appels à `wrangler`, une requête, et de l'affichage.
 *
 * Pourquoi cet outil plutôt qu'un `curl -H …` noté quelque part : une
 * surcharge de version qui ne s'applique pas est IGNORÉE en silence. Taper la
 * commande à la main, c'est accepter d'observer la mauvaise version sans
 * jamais l'apprendre. Les trois garde-fous sont donc ici : on refuse une
 * référence ambiguë, on refuse une version absente du déploiement, et on
 * confronte la version servie à celle demandée.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { nomDuWorker } from "@/lib/config/wrangler-jsonc";
import {
  CHEMIN_VERSION,
  EN_TETE_SURCHARGE,
  applicabilite,
  commandeDeploiementAZero,
  deploiementCourant,
  enTeteDeSurcharge,
  lireArguments,
  lireVerdict,
  resoudreVersion,
  valeurDeSurcharge,
  type PartDeVersion,
  type VersionConnue,
} from "@/lib/release/observation";

/**
 * Lu, jamais codé en dur : un nom divergent ferait ignorer la surcharge.
 * Appelé DANS `main()`, pas au chargement du module : hors du try/catch,
 * un `wrangler.jsonc` illisible rendrait une trace brute et un code 1, au
 * lieu du « ✗ … » et du code 2 que ce fichier promet plus haut.
 */
function lireNomDuWorker(): string {
  return nomDuWorker(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
}

/** Un chemin dans une commande entre apostrophes que l'opérateur va coller. */
function pourApostrophes(valeur: string): string {
  return valeur.replace(/'/g, `'\\''`);
}
const BASE_PAR_DEFAUT = "https://netereka.ci";

/** Sortie 2 = l'outil n'a pas pu faire son travail ; 1 = il l'a fait et dit non. */
const PANNE = 2;
const REFUS = 1;

function wrangler(args: string[]): string {
  return execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

/** `wrangler` préfixe sa sortie JSON d'une bannière ; on repart au premier `[` ou `{`. */
function jsonDe<T>(brut: string): T {
  const debut = brut.search(/[[{]/);
  if (debut === -1) throw new Error(`Réponse wrangler illisible :\n${brut.slice(0, 500)}`);
  return JSON.parse(brut.slice(debut)) as T;
}

interface VersionBrute {
  id: string;
  annotations?: Record<string, string>;
  metadata?: { created_on?: string };
}

interface DeploiementBrut {
  created_on: string;
  versions: { version_id: string; percentage: number }[];
}

function lireVersions(): VersionConnue[] {
  return jsonDe<VersionBrute[]>(wrangler(["versions", "list", "--json"])).map((v) => ({
    id: v.id,
    tag: v.annotations?.["workers/tag"],
    message: v.annotations?.["workers/message"],
    creeLe: v.metadata?.created_on,
  }));
}

/**
 * Le déploiement COURANT. Le tri — et le refus d'une date illisible — vit
 * dans `deploiementCourant`, pur et testé : c'est la logique qui a déjà
 * coûté le plus cher à ce dépôt, et elle était jusqu'ici réécrite dans
 * chaque script sans jamais être éprouvée.
 */
function lireDeploiementCourant(): readonly PartDeVersion[] {
  return deploiementCourant(
    jsonDe<DeploiementBrut[]>(wrangler(["deployments", "list", "--json"])).map((d) => ({
      creeLe: d.created_on,
      parts: d.versions.map((v) => ({ versionId: v.version_id, pourcentage: v.percentage })),
    })),
  );
}

function etiquette(id: string, versions: readonly VersionConnue[]): string {
  const v = versions.find((x) => x.id === id);
  return `${id.slice(0, 8)} (${v?.tag ?? "sans étiquette"})`;
}

async function main(): Promise<number> {
  const NOM_DU_WORKER = lireNomDuWorker();
  const { ref, chemin, base, verifier } = lireArguments(process.argv.slice(2), {
    chemin: "/",
    base: BASE_PAR_DEFAUT,
  });


  const versions = lireVersions();
  const deploiement = lireDeploiementCourant();

  console.log("Déploiement courant :");
  for (const p of deploiement) {
    console.log(`  ${String(p.pourcentage).padStart(3)} %  ${etiquette(p.versionId, versions)}`);
  }
  console.log();

  if (!ref) {
    console.log("Donnez une version à observer : npm run observe -- <sha | préfixe | uuid>");
    console.log("Dernières versions connues :");
    for (const v of [...versions].reverse().slice(0, 5)) {
      console.log(`  ${v.id.slice(0, 8)}  ${v.tag ?? "sans étiquette"}  ${v.creeLe ?? ""}`);
    }
    return 0;
  }

  const resolution = resoudreVersion(ref, versions);
  if (!resolution.trouve) {
    console.error(`✗ ${resolution.raison}`);
    return REFUS;
  }
  const cible = resolution.version;
  console.log(`Version visée : ${etiquette(cible.id, versions)}  ${cible.creeLe ?? ""}`);
  if (cible.message) console.log(`  « ${cible.message} »`);
  console.log();

  const etat = applicabilite(cible.id, deploiement);
  if (!etat.applicable) {
    console.error(`✗ ${etat.raison}`);
    console.error();
    if (etat.placeLibre) {
      console.error("Mettez-la dans le déploiement SANS lui donner de trafic, puis relancez :");
      console.error(`  ${commandeDeploiementAZero(cible.id, deploiement)}`);
    } else {
      console.error(
        "Les deux places du déploiement sont prises : un canari est en vol. Promouvez-le\n" +
          "ou défaites-le (npm run promote / npm run rollback) avant d'en observer une autre.",
      );
    }
    return REFUS;
  }

  console.log(`Elle est dans le déploiement, à ${etat.pourcentage} % du trafic.`);
  console.log();
  console.log("Observer en ligne de commande :");
  console.log(`  curl -sS '${base}${pourApostrophes(chemin)}' \\`);
  console.log(`    -H '${EN_TETE_SURCHARGE}: ${valeurDeSurcharge(NOM_DU_WORKER, cible.id)}'`);
  console.log();
  console.log("Observer dans un navigateur ou un capteur d'écran : posez cet en-tête");
  console.log("(Browser Run : setExtraHTTPHeaders ; une barre d'adresse ne sait pas le faire).");
  console.log(`  ${JSON.stringify(enTeteDeSurcharge(NOM_DU_WORKER, cible.id))}`);

  if (!verifier) {
    console.log();
    console.log("Ajoutez --verifier pour confronter la version servie à celle demandée.");
    return 0;
  }

  console.log();
  const reponse = await fetch(`${base}${CHEMIN_VERSION}?attendu=${cible.id}`, {
    headers: enTeteDeSurcharge(NOM_DU_WORKER, cible.id),
    cache: "no-store",
  });

  // UN 404 VEUT D'ABORD DIRE « LA SURCHARGE N'A PAS PRIS ».
  //
  // La première écriture de ce message disait l'inverse — « la surcharge peut
  // très bien fonctionner » — et c'était rassurer au pire moment. Le cas
  // courant est d'observer une version RÉCENTE, celle qui porte cette route :
  // si elle avait répondu, la route existerait. Un 404 signifie donc
  // qu'autre chose a répondu, c'est-à-dire que la requête est repartie par le
  // canari. Les deux lectures sont imprimées, la dangereuse en premier, et
  // l'on sort en REFUS (1, « l'outil a fait son travail et dit non »), pas en
  // PANNE (2, « l'outil est cassé »).
  if (reponse.status === 404) {
    console.error(
      `✗ ${CHEMIN_VERSION} a répondu 404 — la surcharge n'a probablement PAS été appliquée,`,
    );
    console.error("  et une autre version a servi la requête. N'observez rien sur cette base.");
    console.error(
      `  (Autre lecture, bien plus rare : la version visée, créée le ${cible.creeLe ?? "?"},`,
    );
    console.error("  est antérieure à cette route et ne la porte pas.)");
    return REFUS;
  }
  if (!reponse.ok) {
    const detail = ((await reponse.json().catch(() => null)) as { erreur?: string } | null)?.erreur;
    console.error(`✗ ${CHEMIN_VERSION} a répondu ${reponse.status}${detail ? ` : ${detail}` : "."}`);
    return REFUS;
  }

  const verdict = lireVerdict(await reponse.json().catch(() => null));
  if (!verdict.conforme) {
    console.error(`✗ ${verdict.message}`);
    return REFUS;
  }
  console.log(`✓ ${cible.id.slice(0, 8)} a bien répondu : la surcharge s'applique.`);
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((e: unknown) => {
    console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = PANNE;
  });
