/**
 * De quoi parler à l'API Cloudflare depuis un script local, sans exiger qu'on
 * fabrique un jeton à la main pour chaque usage.
 *
 * POURQUOI CE MODULE EXISTE. Les scripts de configuration de ce dépôt
 * (`cf:subdomain`, `cf:version-affinity`) réclamaient `CLOUDFLARE_API_TOKEN`
 * et `CLOUDFLARE_ACCOUNT_ID` en variables d'environnement. En pratique, cela
 * donnait une ligne de commande d'une centaine de caractères, recopiée de
 * mémoire, et deux échecs observés le 2026-10-04 : d'abord une substitution
 * fautive, puis un jeton expiré (`{"code":10000,"message":"Authentication
 * error"}`) — un message qui ne dit NI que c'est l'expiration, NI comment la
 * réparer. Or la machine qui lance ces scripts a déjà un `wrangler`
 * authentifié.
 *
 * CE QU'IL NE FAIT PAS, ET POURQUOI. Il ne prétend pas que le jeton de
 * `wrangler` remplace un jeton d'API. L'OAuth de `wrangler` porte
 * `workers_scripts:write` et `zone:read`, mais AUCUNE portée d'écriture sur
 * les règles de zone : `cf:version-affinity` ne peut donc pas écrire avec lui.
 * Le dire AVANT l'appel vaut mieux que de laisser l'API répondre
 * « Authentication error », qui se lit comme « mauvais jeton » alors que le
 * jeton est bon et la permission absente.
 *
 * Les fonctions d'analyse sont pures et testées ; seule `identifiantsCloudflare`
 * touche au disque et lance un processus.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export interface JetonWrangler {
  jeton: string;
  /** `null` quand le fichier n'en porte pas : on traite alors comme non expiré. */
  expireLe: Date | null;
  portees: readonly string[];
}

/**
 * Lire `oauth_token`, `expiration_time` et `scopes` du `default.toml` de
 * wrangler.
 *
 * Analyse ciblée plutôt qu'une bibliothèque TOML : trois clés, aucune
 * dépendance ajoutée, et un format qu'on relit. Rend `null` — pas une
 * exception — quand il n'y a pas de jeton : un fichier sans `oauth_token`
 * est l'état normal d'une machine authentifiée par jeton d'API.
 */
export function analyserConfigWrangler(toml: string): JetonWrangler | null {
  const jeton = /^\s*oauth_token\s*=\s*"([^"]*)"/m.exec(toml)?.[1];
  if (!jeton) return null;

  const brutExpiration = /^\s*expiration_time\s*=\s*"([^"]*)"/m.exec(toml)?.[1];
  const horodatage = brutExpiration ? Date.parse(brutExpiration) : Number.NaN;

  // Le tableau peut tenir sur une ligne comme sur plusieurs.
  const brutPortees = /^\s*scopes\s*=\s*\[([\s\S]*?)\]/m.exec(toml)?.[1] ?? "";
  const portees = [...brutPortees.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  return {
    jeton,
    expireLe: Number.isNaN(horodatage) ? null : new Date(horodatage),
    portees,
  };
}

/**
 * Un jeton OAuth `wrangler` vit une heure. La marge évite le cas le plus
 * pénible : un jeton valide au moment du contrôle et périmé au moment de
 * l'appel, qui rend une erreur d'authentification sans rapport apparent.
 */
export function estExpire(expireLe: Date | null, maintenant: Date, margeMs = 60_000): boolean {
  if (expireLe === null) return false;
  return expireLe.getTime() - margeMs <= maintenant.getTime();
}

/** Les portées réclamées que ce jeton ne porte pas. */
export function porteesManquantes(
  portees: readonly string[],
  requises: readonly string[],
): string[] {
  const possedees = new Set(portees);
  return requises.filter((p) => !possedees.has(p));
}

/**
 * Où wrangler range sa configuration, dans l'ordre où l'on cherche.
 *
 * Plusieurs emplacements parce que wrangler suit les chemins XDG, qui
 * diffèrent selon le système et se laissent déplacer par `WRANGLER_HOME`.
 * Coder en dur `~/.config` marcherait sur cette machine-ci et nulle part
 * ailleurs — exactement le genre de supposition que ce dépôt paie cher.
 */
export function cheminsCandidats(
  env: Record<string, string | undefined>,
  accueil: string,
): string[] {
  const chemins = [];
  if (env.WRANGLER_HOME) chemins.push(path.join(env.WRANGLER_HOME, "config", "default.toml"));
  if (env.XDG_CONFIG_HOME) {
    chemins.push(path.join(env.XDG_CONFIG_HOME, ".wrangler", "config", "default.toml"));
  }
  chemins.push(
    path.join(accueil, ".config", ".wrangler", "config", "default.toml"),
    path.join(accueil, "Library", "Preferences", ".wrangler", "config", "default.toml"),
    path.join(accueil, ".wrangler", "config", "default.toml"),
  );
  return [...new Set(chemins)];
}

/**
 * L'identifiant de compte dans la sortie de `wrangler whoami`.
 *
 * On exige UN SEUL identifiant. Plusieurs comptes et l'on refuse en le
 * disant, plutôt que de prendre le premier : appliquer un réglage au mauvais
 * compte Cloudflare est précisément le genre d'erreur qu'on ne voit qu'après.
 */
export function compteDepuisWhoami(sortie: string): string {
  const trouves = [...new Set([...sortie.matchAll(/\b[0-9a-f]{32}\b/g)].map((m) => m[0]))];
  if (trouves.length === 1) return trouves[0];
  if (trouves.length === 0) {
    throw new Error("Aucun identifiant de compte dans la sortie de `wrangler whoami`.");
  }
  throw new Error(
    `${trouves.length} identifiants de compte dans \`wrangler whoami\` : ` +
      "posez CLOUDFLARE_ACCOUNT_ID pour trancher.",
  );
}

export interface Identifiants {
  jeton: string;
  compte: string;
  /** D'où vient le jeton, pour que le script puisse le dire à l'écran. */
  source: string;
}

export interface BesoinsAuth {
  /**
   * Les portées OAuth que le repli `wrangler` doit porter — ou `null` quand
   * AUCUNE ne couvre le besoin (les règles de zone, par exemple). Dans ce cas
   * le repli est refusé d'emblée, avec `droitsApiRequis` dans le message.
   */
  porteesWrangler: readonly string[] | null;
  /** Les droits à cocher en créant un jeton d'API, cités tels quels. */
  droitsApiRequis: string;
}

function wranglerWhoami(): string {
  // Appeler `whoami` AVANT de lire le fichier n'est pas décoratif : c'est ce
  // qui déclenche le renouvellement du jeton. Sans cela on relit une valeur
  // périmée depuis le disque — l'échec exact observé le 2026-10-04.
  return execFileSync("npx", ["wrangler", "whoami"], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

export function identifiantsCloudflare(besoins: BesoinsAuth): Identifiants {
  const env = process.env;

  if (env.CLOUDFLARE_API_TOKEN) {
    const compte = env.CLOUDFLARE_ACCOUNT_ID ?? compteDepuisWhoami(wranglerWhoami());
    return { jeton: env.CLOUDFLARE_API_TOKEN, compte, source: "CLOUDFLARE_API_TOKEN" };
  }

  const exiger = (message: string): never => {
    throw new Error(
      `${message}\n  Posez CLOUDFLARE_API_TOKEN avec les droits : ${besoins.droitsApiRequis}.`,
    );
  };

  if (besoins.porteesWrangler === null) {
    exiger(
      "Aucune portée OAuth de `wrangler` ne couvre cette opération, donc pas de repli possible.",
    );
  }

  const sortie = wranglerWhoami();
  const chemin = cheminsCandidats(env, homedir()).find((c) => existsSync(c));
  if (!chemin) exiger("Aucune configuration `wrangler` trouvée, et CLOUDFLARE_API_TOKEN est absent.");

  const config = analyserConfigWrangler(readFileSync(chemin!, "utf8"));
  if (!config) {
    exiger(`\`${chemin}\` ne porte pas de jeton OAuth (authentification par jeton d'API ?).`);
  }
  if (estExpire(config!.expireLe, new Date())) {
    exiger("Le jeton OAuth de `wrangler` est expiré ; `npx wrangler login` le renouvelle.");
  }

  const manquantes = porteesManquantes(config!.portees, besoins.porteesWrangler!);
  if (manquantes.length > 0) {
    exiger(`Le jeton OAuth de \`wrangler\` ne porte pas : ${manquantes.join(", ")}.`);
  }

  const compte = env.CLOUDFLARE_ACCOUNT_ID ?? compteDepuisWhoami(sortie);
  return { jeton: config!.jeton, compte, source: "jeton OAuth de wrangler (renouvelé)" };
}
