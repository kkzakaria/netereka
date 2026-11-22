/**
 * Lance le Worker CONSTRUIT (`.open-next/worker.js`) sous `wrangler dev
 * --local` et vérifie qu'il sert des pages.
 *
 *   npm run build:worker            # NEXT_PUBLIC_R2_URL requis, voir CLAUDE.md
 *   npm run check:demarrage         # port 8787
 *   npm run check:demarrage -- --port 8799
 *
 * Pourquoi, et ce que chaque sonde prouve : `lib/release/demarrage.ts`. Ici,
 * il n'y a que de l'orchestration — une base jetable, un processus, des
 * requêtes, de l'affichage.
 *
 * CODES DE SORTIE (même convention que `check:drift`) :
 *   0  le Worker démarre et chaque sonde répond comme attendu ;
 *   1  le Worker a tourné, et au moins une sonde a échoué — LE signal ;
 *   2  la vérification elle-même n'a pas pu se faire (pas de build, migration
 *      en échec, wrangler qui ne démarre pas). À ne pas lire comme « le
 *      Worker est cassé » : c'est l'outil qui l'est.
 *
 * SANS IDENTIFIANTS CLOUDFLARE, ET C'EST L'ESSENTIEL. `--local` coupe les
 * liaisons distantes (`BROWSER`), la base est une D1 locale créée pour
 * l'occasion, et les secrets sont factices. Le défaut que ce contrôle doit
 * arrêter est arrivé par une PR de Dependabot, qui n'a pas accès aux secrets
 * du dépôt : une vérification qui en dépendrait serait muette exactement là.
 *
 * LA BASE N'EST JAMAIS CELLE DU DÉVELOPPEUR. Elle vit dans un dossier
 * temporaire (`--persist-to`), migrée depuis `drizzle/*.sql`, puis supprimée.
 * `.wrangler/state` n'est pas touché.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { SONDES, juger, rapport, sansReponse, type Sonde, type Verdict } from "@/lib/release/demarrage";

const RACINE = process.cwd();
const WRANGLER = path.join(RACINE, "node_modules", "wrangler", "bin", "wrangler.js");
const WORKER = path.join(RACINE, ".open-next", "worker.js");
/** Le nom que `scripts/migrate.sh` utilise lui aussi. */
const BASE = "netereka-db";
const DELAI_DEMARRAGE_MS = 120_000;
const DELAI_SONDE_MS = 60_000;

class OutilEnPanne extends Error {}

function lirePort(argv: string[]): number {
  const i = argv.indexOf("--port");
  if (i === -1) return 8787;
  const port = Number(argv[i + 1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new OutilEnPanne(`--port invalide : ${argv[i + 1]}`);
  return port;
}

/** Variables factices : de quoi laisser `initAuth()` s'initialiser, rien qui ouvre quoi que ce soit. */
function variables(port: number): string[] {
  const factice = "verifier-demarrage";
  const vars: Record<string, string> = {
    SITE_URL: `http://127.0.0.1:${port}`,
    BETTER_AUTH_SECRET: `${factice}-${"x".repeat(32)}`,
    // Clé secrète de TEST publiée par Cloudflare : Turnstile la valide toujours.
    TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    GOOGLE_CLIENT_ID: factice,
    GOOGLE_CLIENT_SECRET: factice,
    FACEBOOK_APP_ID: factice,
    FACEBOOK_APP_SECRET: factice,
    APPLE_CLIENT_ID: factice,
    APPLE_CLIENT_SECRET: factice,
  };
  return Object.entries(vars).flatMap(([cle, valeur]) => ["--var", `${cle}:${valeur}`]);
}

function migrer(persistance: string): void {
  const fichiers = readdirSync(path.join(RACINE, "drizzle"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (fichiers.length === 0) throw new OutilEnPanne("aucune migration dans drizzle/");
  for (const f of fichiers) {
    const r = spawnSync(
      process.execPath,
      [WRANGLER, "d1", "execute", BASE, "--local", "--persist-to", persistance, "--file", path.join("drizzle", f)],
      { cwd: RACINE, encoding: "utf8" },
    );
    if (r.status !== 0) {
      throw new OutilEnPanne(`migration ${f} en échec :\n${(r.stderr || r.stdout).slice(-2000)}`);
    }
  }
  console.log(`  base locale jetable migrée (${fichiers.length} fichiers)`);
}

function arreter(processus: ChildProcess): void {
  if (processus.exitCode !== null || processus.pid === undefined) return;
  if (process.platform === "win32") {
    // `workerd` est un petit-enfant : sans /T il survit, et garde le port.
    spawnSync("taskkill", ["/pid", String(processus.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-processus.pid, "SIGTERM");
    } catch {
      /* déjà terminé */
    }
  }
}

async function attendrePret(url: string, processus: ChildProcess, journal: () => string): Promise<void> {
  const limite = Date.now() + DELAI_DEMARRAGE_MS;
  while (Date.now() < limite) {
    if (processus.exitCode !== null) {
      throw new OutilEnPanne(`wrangler s'est arrêté (code ${processus.exitCode}) avant d'écouter :\n${journal()}`);
    }
    try {
      // N'importe quelle réponse HTTP suffit : un 500 est une réponse, et c'est
      // aux sondes de le juger. On attend seulement que le port écoute.
      await fetch(url, { signal: AbortSignal.timeout(5_000) });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }
  throw new OutilEnPanne(`wrangler n'écoute pas après ${DELAI_DEMARRAGE_MS / 1000} s :\n${journal()}`);
}

async function sonder(base: string, sonde: Sonde): Promise<Verdict> {
  try {
    const reponse = await fetch(base + sonde.chemin, {
      method: sonde.methode,
      body: sonde.corps,
      headers: sonde.corps ? { "content-type": "application/json" } : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(DELAI_SONDE_MS),
    });
    return juger(sonde, { statut: reponse.status, corps: await reponse.text() });
  } catch (erreur) {
    return sansReponse(sonde, erreur);
  }
}

async function main(): Promise<number> {
  const port = lirePort(process.argv.slice(2));
  if (!existsSync(WORKER)) throw new OutilEnPanne(`${WORKER} introuvable : lancer d'abord \`npm run build:worker\``);
  if (!existsSync(WRANGLER)) throw new OutilEnPanne(`${WRANGLER} introuvable : lancer d'abord \`npm ci\``);

  const persistance = mkdtempSync(path.join(tmpdir(), "netereka-demarrage-"));
  let processus: ChildProcess | undefined;
  try {
    console.log("Vérification du démarrage du Worker construit");
    migrer(persistance);

    const sortie: string[] = [];
    processus = spawn(
      process.execPath,
      [
        WRANGLER, "dev", "--local", "--ip", "127.0.0.1", "--port", String(port),
        "--persist-to", persistance, "--show-interactive-dev-session=false",
        ...variables(port),
      ],
      { cwd: RACINE, detached: process.platform !== "win32", env: { ...process.env, CI: "1" } },
    );
    const garder = (morceau: Buffer) => {
      sortie.push(morceau.toString());
      if (sortie.length > 400) sortie.splice(0, sortie.length - 400);
    };
    processus.stdout?.on("data", garder);
    processus.stderr?.on("data", garder);
    const journal = () => sortie.join("").split("\n").slice(-60).join("\n");

    const base = `http://127.0.0.1:${port}`;
    await attendrePret(`${base}/api/version`, processus, journal);
    console.log(`  wrangler dev --local écoute sur ${base}`);

    const verdicts: Verdict[] = [];
    // L'une après l'autre : la première requête paie le démarrage à froid, et
    // un échec se lit mieux quand on sait laquelle l'a provoqué.
    for (const sonde of SONDES) verdicts.push(await sonder(base, sonde));

    const { ok, lignes } = rapport(verdicts);
    console.log(lignes.join("\n"));
    if (!ok) {
      console.log("\nFin du journal de wrangler :\n" + journal());
      console.log("\n✗ Le Worker construit ne sert pas ces routes : ne pas déployer.");
      return 1;
    }
    console.log(`\n✓ Le Worker démarre et sert ses ${verdicts.length} routes témoins.`);
    return 0;
  } finally {
    if (processus) arreter(processus);
    try {
      rmSync(persistance, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
    } catch {
      // Un fichier encore verrouillé (Windows) ne doit pas changer le verdict :
      // c'est un dossier temporaire, le système le videra.
      console.log(`  (dossier temporaire non supprimé : ${persistance})`);
    }
  }
}

main().then(
  (code) => process.exit(code),
  (erreur) => {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    console.error(`\n✗ Vérification impossible : ${message}`);
    process.exit(2);
  },
);
