/**
 * Convertit le contenu structuré existant (gabarit de bannière) en contenu
 * libre HTML.
 *
 * Le volet PRODUITS a été retiré : les quatre colonnes Story qu'il lisait
 * (`tagline`, `highlights`, `feature_blocks`, `faq`) ont quitté le schéma, et
 * elles étaient vides sur les 1068 fiches de production — il n'y a plus rien à
 * convertir. Seul le volet bannières subsiste.
 *
 * Usage :
 *   npm run content:convert -- --local   --dry-run
 *   npm run content:convert -- --local
 *   npm run content:convert -- --remote  --dry-run
 *   npm run content:convert -- --remote
 *
 * Par défaut, la sortie ne détaille QUE ce qui mérite un regard humain avant
 * l'écriture irréversible : les lignes converties et les échecs. Les lignes
 * ignorées sont résumées en un tally par raison. `--verbose` restaure le
 * détail ligne à ligne complet (une ligne par ignoré compris).
 *
 * Idempotent : une ligne déjà convertie est ignorée. Rejouable sans risque.
 *
 * La donnée d'origine n'est récupérable que par l'export D1 pris juste avant.
 * Cet export est une étape obligatoire du runbook.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync, readSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { planBanner, type BannerRow } from "../lib/content/conversion-plan";

const DB_NAME = "netereka-db";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const local = args.includes("--local");
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");

if (remote === local) {
  console.error("Choisis exactement une cible : --local ou --remote");
  process.exit(1);
}

/**
 * Lit une ligne sur l'entrée standard, de façon SYNCHRONE — le reste du script
 * est écrit en style synchrone (execFileSync partout), et une confirmation
 * async casserait ce style pour un seul appel. `readSync(0, …)` bloque jusqu'à
 * ce qu'un octet arrive, ce qui suffit pour une invite interactive.
 *
 * EAGAIN peut survenir sur un fd 0 non bloquant (observé sur certains
 * terminaux) : on retente plutôt que de laisser planter la confirmation sur
 * un faux négatif. Toute autre erreur — ou un pipe fermé (bytesRead === 0,
 * EOF immédiat) — remonte telle quelle : une entrée non interactive doit
 * échouer, pas boucler indéfiniment ni être lue comme une confirmation vide.
 */
function readLineSync(): string {
  const buffer = Buffer.alloc(1);
  let input = "";
  for (;;) {
    let bytesRead: number;
    try {
      bytesRead = readSync(0, buffer, 0, 1, null);
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code === "EAGAIN") continue;
      throw err;
    }
    if (bytesRead === 0) break;
    const char = buffer.toString("utf8");
    if (char === "\n") break;
    if (char !== "\r") input += char;
  }
  return input;
}

/**
 * Confirmation tapée, requise uniquement pour une écriture réelle contre la
 * base distante — la combinaison la plus destructrice possible et, avant ce
 * garde, celle obtenue par défaut (pas de flag à ajouter, contrairement à
 * --dry-run qui lui doit être explicitement retiré). Le chemin --dry-run et
 * toute exécution --local ne posent aucune question : ils n'écrivent rien
 * d'irréversible, ou n'écrivent rien du tout.
 */
if (remote && !dryRun) {
  process.stdout.write(
    "\n⚠️  Conversion RÉELLE contre la base distante (aucune annulation au-delà de l'export D1 — " +
      "voir Étape R du runbook). Tape CONVERTIR pour continuer : ",
  );
  const answer = readLineSync();
  if (answer.trim() !== "CONVERTIR") {
    console.error("\nConfirmation refusée ou incorrecte. Rien n'a été lu ni écrit.");
    process.exit(1);
  }
  console.log("");
}

const target = remote ? "--remote" : "--local";

function d1Query<T>(sql: string): T[] {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB_NAME, target, "--json", "--command", sql],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(out);
  } catch {
    throw new Error("Réponse Wrangler illisible : ce n'est pas du JSON. Lecture interrompue.");
  }
  // Un échec de lecture DOIT planter. Rendre [] ferait dire au bilan « rien à
  // convertir » sur une base qui a tout à convertir — le pire signal possible
  // avant une opération irréversible.
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Réponse Wrangler inattendue : tableau de résultats absent.");
  }
  const first = parsed[0] as { results?: unknown; success?: boolean };
  if (first.success === false) throw new Error("Wrangler signale un échec de requête.");
  if (!Array.isArray(first.results)) {
    throw new Error("Réponse Wrangler inattendue : champ `results` absent ou non-tableau.");
  }
  return first.results as T[];
}

function d1Exec(statements: string[]): void {
  if (statements.length === 0) return;
  const dir = mkdtempSync(path.join(tmpdir(), "netereka-convert-"));
  const file = path.join(dir, "convert.sql");
  try {
    writeFileSync(file, statements.join("\n"), "utf8");
    execFileSync("npx", ["wrangler", "d1", "execute", DB_NAME, target, "--file", file], {
      encoding: "utf8",
      stdio: "inherit",
      maxBuffer: 256 * 1024 * 1024,
    });
  } finally {
    // Le fichier temporaire contient tout le contenu converti en clair : ne
    // pas le laisser traîner dans le répertoire temp de l'OS après un run réel.
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Littéral SQLite : on double l'apostrophe, et c'est tout. */
function lit(value: string | null): string {
  if (value == null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

// Raisons de skip connues, telles que retournées par planBanner
// (lib/content/conversion-plan.ts). Pré-initialisées à 0 pour que le tally par
// défaut montre aussi les raisons qui n'ont déclenché aucune ligne — utile par
// exemple pour vérifier d'un coup d'œil qu'aucune ligne n'était déjà convertie.
const BANNER_SKIP_REASONS = ["déjà converti"];

function newTally(reasons: string[]): Map<string, number> {
  return new Map(reasons.map((reason) => [reason, 0]));
}

function tally(map: Map<string, number>, reason: string): void {
  map.set(reason, (map.get(reason) ?? 0) + 1);
}

function printTally(map: Map<string, number>): void {
  const parts = [...map.entries()].map(([reason, count]) => `${count} ignoré(s) (${reason})`);
  console.log(`  · ${parts.join(", ")}`);
}

let converted = 0;
let skipped = 0;
let failed = 0;
const statements: string[] = [];

console.log(`\n=== Bannières (${target}${dryRun ? ", simulation" : ""}) ===`);

const banners = d1Query<BannerRow>(
  `SELECT id, title, subtitle, badge_text, price, cta_text, link_url, content_html FROM banners`,
);

const bannerSkipTally = newTally(BANNER_SKIP_REASONS);

for (const row of banners) {
  try {
    const plan = planBanner(row);
    if (plan.action === "skip") {
      skipped++;
      tally(bannerSkipTally, plan.reason);
      if (verbose) console.log(`  · bannière ${row.id} — ignorée (${plan.reason})`);
      continue;
    }
    console.log(`  ✓ bannière ${row.id} — convertie`);
    converted++;
    statements.push(
      `UPDATE banners SET content_html = ${lit(plan.updates.content_html)}, ` +
        `updated_at = datetime('now') WHERE id = ${lit(String(row.id))};`,
    );
  } catch (err) {
    failed++;
    console.error(`  ✗ bannière ${row.id} — échec, laissée intacte :`, err);
  }
}

if (!verbose) printTally(bannerSkipTally);

console.log(`\n=== Bilan ===`);
console.log(
  `  mode      : ${verbose ? "détaillé (--verbose)" : "résumé (ajoute --verbose pour le détail ligne à ligne)"}`,
);
console.log(`  convertis : ${converted}`);
console.log(`  ignorés   : ${skipped}`);
console.log(`  échecs    : ${failed}`);

if (dryRun) {
  console.log(`\nSimulation : aucune écriture. ${statements.length} instruction(s) auraient été appliquées.`);
  process.exit(failed > 0 ? 1 : 0);
}

d1Exec(statements);
console.log(`\n${statements.length} instruction(s) appliquée(s).`);
process.exit(failed > 0 ? 1 : 0);
