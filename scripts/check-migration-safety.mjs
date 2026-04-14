#!/usr/bin/env node
// @ts-check

/**
 * Lints newly-added Drizzle migration files to block patterns that break
 * expand/contract discipline during canary 10/90 deployments.
 *
 * Exit code: 0 on pass (or warnings only), 1 on errors.
 *
 * Usage:
 *   node scripts/check-migration-safety.mjs [--files file1.sql file2.sql]
 *
 * If --files is not provided, detects new files automatically from git diff
 * depending on context (PR, pre-commit, push to main, or fallback to all).
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, relative } from "node:path";

/**
 * Pattern definitions. Case-insensitive, matched against each file's content.
 * @type {ReadonlyArray<{ id: string, level: "error" | "warning", regex: RegExp, reason: string }>}
 */
export const PATTERNS = [
  {
    id: "drop-column",
    level: "error",
    regex: /\bDROP\s+COLUMN\b/i,
    reason:
      "DROP COLUMN casse l'ancien code pendant le canary 10/90. " +
      "Pattern recommandé : PR1 retire les usages, PR2 drop la colonne.",
  },
  {
    id: "drop-table",
    level: "error",
    regex: /\bDROP\s+TABLE\b/i,
    reason:
      "DROP TABLE casse l'ancien code pendant le canary. " +
      "Pattern recommandé : PR1 retire les usages, PR2 drop la table.",
  },
  {
    id: "rename-column",
    level: "error",
    regex: /\bRENAME\s+COLUMN\b/i,
    reason:
      "RENAME COLUMN casse l'ancien code. " +
      "Pattern recommandé : PR1 ajoute nouvelle colonne + dual-write, " +
      "PR2 migre les lectures, PR3 drop l'ancienne.",
  },
  {
    id: "alter-not-null-no-default",
    level: "error",
    // ALTER COLUMN ... NOT NULL without DEFAULT in the same statement
    regex: /\bALTER\s+(?:TABLE\s+\S+\s+)?(?:ALTER\s+)?COLUMN\b[^;]*\bNOT\s+NULL\b(?![^;]*\bDEFAULT\b)/i,
    reason:
      "ALTER COLUMN NOT NULL sans DEFAULT échoue sur lignes existantes. " +
      "Ajoutez DEFAULT ou faites expand/contract.",
  },
  {
    id: "drop-unique-index",
    level: "error",
    // SQLite's DROP INDEX syntax doesn't include the UNIQUE keyword.
    // Heuristic: match index names containing "unique" (Drizzle convention:
    // unique indexes are named with suffix `_unique`, e.g. `categories_slug_unique`).
    // No word boundary after `unique` because `_unique` is not a regex word boundary.
    regex: /\bDROP\s+INDEX\b[^;]*unique/i,
    reason:
      "DROP INDEX sur un index dont le nom contient 'unique' — probablement une contrainte critique. " +
      "Vérifier explicitement avec le bypass marker si intentionnel.",
  },
  {
    id: "drop-index",
    level: "warning",
    // Any other DROP INDEX (index name doesn't contain "unique")
    regex: /\bDROP\s+INDEX\b(?![^;]*unique)/i,
    reason:
      "DROP INDEX détecté. Autorisé mais peut impacter les performances — vérifier.",
  },
];

const BYPASS_RE = /--\s*migration-safety:\s*acknowledged\s+reason="([^"]+)"/i;

/**
 * @param {string} content SQL file content
 * @returns {{ violations: Array<{patternId: string, level: "error"|"warning", reason: string}>, bypass: string | null }}
 */
export function analyze(content) {
  const bypassMatch = content.match(BYPASS_RE);
  const bypass = bypassMatch ? bypassMatch[1] : null;

  if (bypass) {
    return { violations: [], bypass };
  }

  const violations = [];
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(content)) {
      violations.push({
        patternId: pattern.id,
        level: pattern.level,
        reason: pattern.reason,
      });
    }
  }
  return { violations, bypass: null };
}

/**
 * @returns {string[]} list of new .sql files in drizzle/ to lint
 */
function detectNewFiles() {
  // Prefer explicit --files argument
  const argsIdx = process.argv.indexOf("--files");
  if (argsIdx !== -1) {
    return process.argv.slice(argsIdx + 1);
  }

  // Each strategy returns:
  //   - `null` if it doesn't apply (try next)
  //   - a string (possibly empty) if it ran successfully
  //
  // The first strategy that applies is trusted — including when it reports
  // zero new files. We intentionally do NOT fall back to "lint every file
  // in drizzle/" because historical migrations are out of scope for the
  // current rules, and re-flagging them on every unrelated commit creates
  // noise (and false positives on patterns like Drizzle's SQLite
  // column-rename emulation).
  const strategies = [
    // PR context
    () => {
      const baseRef = process.env.GITHUB_BASE_REF;
      if (!baseRef) return null;
      return execSync(
        `git diff --name-only --diff-filter=A origin/${baseRef}...HEAD -- 'drizzle/*.sql'`,
        { encoding: "utf-8" }
      );
    },
    // Pre-commit (staged files)
    () => {
      if (!process.env.HUSKY_GIT_PARAMS && process.env.PRE_COMMIT !== "1") {
        return null;
      }
      return execSync(
        `git diff --name-only --diff-filter=A --cached -- 'drizzle/*.sql'`,
        { encoding: "utf-8" }
      );
    },
    // Last commit (push context or local manual run)
    () =>
      execSync(
        `git diff --name-only --diff-filter=A HEAD~1 HEAD -- 'drizzle/*.sql'`,
        { encoding: "utf-8" }
      ),
  ];

  for (const strategy of strategies) {
    try {
      const output = strategy();
      if (output === null) continue;
      return output.trim().split("\n").filter(Boolean);
    } catch {
      continue;
    }
  }

  console.warn(
    "[migration-safety] Aucune stratégie de détection applicable — skip."
  );
  return [];
}

function main() {
  const files = detectNewFiles();
  if (files.length === 0) {
    console.log("[migration-safety] Aucun fichier de migration à vérifier.");
    process.exit(0);
  }

  let hasError = false;
  for (const file of files) {
    const path = resolve(process.cwd(), file);
    let content;
    try {
      content = readFileSync(path, "utf-8");
    } catch {
      console.warn(`[migration-safety] Ignoré (introuvable) : ${file}`);
      continue;
    }

    const { violations, bypass } = analyze(content);

    if (bypass) {
      console.log(
        `[migration-safety] ✓ ${relative(process.cwd(), path)} — bypass accepté (raison : "${bypass}")`
      );
      continue;
    }

    if (violations.length === 0) {
      console.log(`[migration-safety] ✓ ${relative(process.cwd(), path)}`);
      continue;
    }

    for (const v of violations) {
      const icon = v.level === "error" ? "✗" : "⚠";
      console.log(`[migration-safety] ${icon} ${file} — ${v.patternId} (${v.level})`);
      console.log(`    ${v.reason}`);
      if (v.level === "error") hasError = true;
    }
    console.log(
      `    Pour autoriser intentionnellement : ajoutez dans le fichier SQL :\n` +
        `    -- migration-safety: acknowledged reason="<votre raison>"`
    );
  }

  process.exit(hasError ? 1 : 0);
}

// Only run when invoked as entry point, not when imported for tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
