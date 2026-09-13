/**
 * Convertit le contenu structuré existant (story produit, gabarit de bannière)
 * en contenu libre HTML.
 *
 * Usage :
 *   npm run content:convert -- --local   --dry-run
 *   npm run content:convert -- --local
 *   npm run content:convert -- --remote  --dry-run
 *   npm run content:convert -- --remote
 *
 * Par défaut, la sortie ne détaille QUE ce qui mérite un regard humain avant
 * l'écriture irréversible : les lignes converties, les échecs et les lignes
 * dont des colonnes story sont illisibles. Les lignes ignorées sont résumées
 * en un tally par raison — sur une grosse base, un flux d'une ligne par
 * produit ignoré noie précisément la ligne qui compte. `--verbose` restaure
 * le détail ligne à ligne complet (une ligne par ignoré compris).
 *
 * Idempotent : une ligne déjà convertie est ignorée. Rejouable sans risque.
 *
 * IMPORTANT — ce script s'exécute ENTRE deux déploiements (§ 3.4 du spec), pas
 * pendant l'un d'eux. Le pipeline sert deux versions du code en canary : vider
 * les colonnes story est précisément ce qui garde l'ancienne version correcte,
 * puisqu'elle rend alors la description — qui contient désormais tout — et des
 * blocs story vides.
 *
 * La donnée d'origine n'est récupérable que par l'export D1 pris juste avant.
 * Cet export est une étape obligatoire du runbook.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { planProduct, planBanner, type ProductRow, type BannerRow } from "../lib/content/conversion-plan";

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

if (!process.env.NEXT_PUBLIC_R2_URL) {
  console.error(
    "NEXT_PUBLIC_R2_URL n'est pas défini. Les images des blocs seraient écrites avec un chemin cassé, " +
      "de façon permanente. Exporte la variable (voir .env.local) et relance.",
  );
  process.exit(1);
}

const target = remote ? "--remote" : "--local";

function d1Query<T>(sql: string): T[] {
  const out = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB_NAME, target, "--json", "--command", sql],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  const parsed = JSON.parse(out) as { results: T[] }[];
  return parsed[0]?.results ?? [];
}

function d1Exec(statements: string[]): void {
  if (statements.length === 0) return;
  const dir = mkdtempSync(path.join(tmpdir(), "netereka-convert-"));
  const file = path.join(dir, "convert.sql");
  writeFileSync(file, statements.join("\n"), "utf8");
  execFileSync("npx", ["wrangler", "d1", "execute", DB_NAME, target, "--file", file], {
    encoding: "utf8",
    stdio: "inherit",
    maxBuffer: 256 * 1024 * 1024,
  });
}

/** Littéral SQLite : on double l'apostrophe, et c'est tout. */
function lit(value: string | null): string {
  if (value == null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

// Raisons de skip connues, telles que retournées par planProduct / planBanner
// (lib/content/conversion-plan.ts). Pré-initialisées à 0 pour que le tally par
// défaut montre aussi les raisons qui n'ont déclenché aucune ligne — utile par
// exemple pour vérifier d'un coup d'œil qu'aucune ligne n'était déjà convertie.
const PRODUCT_SKIP_REASONS = ["aucun contenu", "déjà converti"];
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
let unparsedCount = 0;
const statements: string[] = [];

console.log(`\n=== Produits (${target}${dryRun ? ", simulation" : ""}) ===`);

const products = d1Query<ProductRow>(
  `SELECT id, description, description_type, tagline, highlights, feature_blocks, faq, faq_html
     FROM products`,
);

const productSkipTally = newTally(PRODUCT_SKIP_REASONS);

for (const row of products) {
  try {
    const plan = planProduct(row);
    if (plan.action === "skip") {
      skipped++;
      tally(productSkipTally, plan.reason);
      if (verbose) console.log(`  · ${row.id} — ignoré (${plan.reason})`);
      continue;
    }
    const icons = plan.unresolvedIcons.length
      ? ` — icônes non résolues : ${plan.unresolvedIcons.join(", ")}`
      : "";
    // Colonnes story non vides mais dont le JSON n'a pas validé le schéma :
    // leur contenu est perdu de façon permanente par cette conversion.
    // L'opérateur doit le voir avant le lancement réel (§ 3.3 du spec).
    const unparsed = plan.unparsedColumns.length
      ? ` — colonnes illisibles, contenu perdu : ${plan.unparsedColumns.join(", ")}`
      : "";
    if (plan.unparsedColumns.length) unparsedCount++;
    console.log(`  ✓ ${row.id} — converti${icons}${unparsed}`);
    converted++;
    statements.push(
      `UPDATE products SET description = ${lit(plan.updates.description)}, ` +
        `description_type = 'html', faq_html = ${lit(plan.updates.faq_html)}, ` +
        `tagline = NULL, highlights = NULL, feature_blocks = NULL, faq = NULL, ` +
        `updated_at = datetime('now') WHERE id = ${lit(row.id)};`,
    );
  } catch (err) {
    // Une ligne qui échoue est signalée et laissée intacte : le script
    // n'écrit rien pour elle (§ 3.3 du spec).
    failed++;
    console.error(`  ✗ ${row.id} — échec, laissé intact :`, err);
  }
}

if (!verbose) printTally(productSkipTally);

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
        `updated_at = datetime('now') WHERE id = ${row.id};`,
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
console.log(
  unparsedCount > 0
    ? `  colonnes illisibles (contenu perdu) : ${unparsedCount} produit(s)`
    : `  colonnes illisibles (contenu perdu) : aucune`,
);

if (dryRun) {
  console.log(`\nSimulation : aucune écriture. ${statements.length} instruction(s) auraient été appliquées.`);
  process.exit(failed > 0 ? 1 : 0);
}

d1Exec(statements);
console.log(`\n${statements.length} instruction(s) appliquée(s).`);
process.exit(failed > 0 ? 1 : 0);
