# Release Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre le pipeline de déploiement pour apporter rollback instantané (Cloudflare Versions), canary 10/90 manuel, versioning auto (release-please), enforcement Conventional Commits, lint des migrations (expand/contract), et CD séparé pour le Worker WhatsApp.

**Architecture :** 6 workflows GitHub Actions découplant *deploy* (merge → 10%) / *promote* (manuel → 100%) / *release* (Release PR → SemVer tag). Script Node.js de lint SQL testé en vitest. Wrappers bash interactifs pour rollback/promote en local. Worker WhatsApp déployé sur son propre workflow path-filtered.

**Tech Stack :** GitHub Actions, `cloudflare/wrangler-action@v3`, `googleapis/release-please-action@v4`, `@commitlint/cli`, Husky, Node.js (ESM) pour le lint, bash pour les wrappers CLI.

**Implementation notes :**
- La spec mentionne `scripts/check-migration-safety.sh` ; on implémente en `scripts/check-migration-safety.mjs` pour bénéficier de vitest. Même comportement, testabilité en plus.
- Strategy de PRs recommandée : 3 PRs ciblées (PR A : migration-safety + commitlint, PR B : pipeline Cloudflare Versions + local wrappers + release-please, PR C : WhatsApp CD + doc CLAUDE.md). Un seul gros PR reste acceptable si préféré.
- Référence spec : `docs/superpowers/specs/2026-04-14-release-pipeline-design.md`.

---

## Phase 0 — Pré-flight (actions hors-code)

### Task 0.1 : Vérifier la rétention Cloudflare Versions

**Files :** (aucun changement de fichier — note à rapporter dans la PR description)

- [ ] **Step 1 : Lire la doc Cloudflare Versions**

Ouvrir https://developers.cloudflare.com/workers/configuration/versions-and-deployments/ et identifier :
- Durée de rétention d'une version (30 jours ? 7 jours ? illimitée tant que le Worker existe ?)
- Nombre max de versions historisées par Worker
- Contraintes spécifiques au plan (Free vs Paid)

- [ ] **Step 2 : Vérifier en pratique sur le compte du projet**

Run :

```bash
npx wrangler versions list --name netereka
```

Attendu : liste des versions déjà présentes (au moins la version actuelle). Noter la date de la plus ancienne.

- [ ] **Step 3 : Décider du fallback**

Deux cas :

- **Rétention ≥ 30 jours** : `rollback.yml` seul est un filet suffisant. Continuer le plan tel quel.
- **Rétention < 30 jours** : ajouter dans le CHANGELOG Task 7.1 une section "Fallback rollback" expliquant comment re-déployer depuis un tag git (`git checkout <tag> && npm run deploy`). Pas de blocage pour le plan.

Documenter la conclusion dans la description de la PR A et dans `CLAUDE.md` (Task 7.1).

- [ ] **Step 4 : Vérifier les permissions du token Cloudflare**

Dans le dashboard Cloudflare → My Profile → API Tokens, vérifier que le token utilisé en CI (`CLOUDFLARE_API_TOKEN` GitHub secret) possède :

- `Workers Scripts:Edit`
- `D1:Edit`
- `Account:Workers Scripts:Edit` (pour versions upload/deploy/rollback — parfois listé séparément)

Si besoin, régénérer le token et mettre à jour le secret GitHub.

---

### Task 0.2 : Créer la branche d'implémentation

**Files :** aucun.

- [ ] **Step 1 : Depuis main à jour, créer la branche**

```bash
git checkout main
git pull
git checkout -b feat/release-pipeline-phase-1
```

Cette première branche couvre Phases 1+2 (migration safety + commitlint) → PR A. Les phases suivantes auront leurs branches dédiées (rappel : mémoire projet = une branche + PR par changement).

---

## Phase 1 — Lint de migration safety

### Task 1.1 : Scaffold du script Node.js

**Files :**
- Create : `scripts/check-migration-safety.mjs`
- Create : `__tests__/unit/check-migration-safety.test.ts`

- [ ] **Step 1 : Créer le squelette du script**

Crée `scripts/check-migration-safety.mjs` :

```javascript
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

/** Pattern definitions. Case-insensitive, matched against each file's content. */
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
      if (process.env.HUSKY_GIT_PARAMS || process.env.PRE_COMMIT === "1") {
        return execSync(
          `git diff --name-only --diff-filter=A --cached -- 'drizzle/*.sql'`,
          { encoding: "utf-8" }
        );
      }
      return null;
    },
    // Push to main
    () => {
      return execSync(
        `git diff --name-only --diff-filter=A HEAD~1 HEAD -- 'drizzle/*.sql'`,
        { encoding: "utf-8" }
      );
    },
  ];

  for (const strategy of strategies) {
    try {
      const output = strategy();
      if (output !== null && output.trim()) {
        return output.trim().split("\n").filter(Boolean);
      }
    } catch {
      continue;
    }
  }

  // Fallback : tous les fichiers drizzle/*.sql (safe mais verbeux)
  try {
    const all = execSync(`ls drizzle/*.sql 2>/dev/null || true`, {
      encoding: "utf-8",
    });
    console.warn(
      "[migration-safety] Aucune base de diff détectée, lint de tous les fichiers drizzle/*.sql"
    );
    return all.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
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
```

- [ ] **Step 2 : Rendre le script exécutable**

```bash
chmod +x scripts/check-migration-safety.mjs
```

---

### Task 1.2 : Tests unitaires de l'analyse

**Files :**
- Create : `__tests__/unit/check-migration-safety.test.ts`

- [ ] **Step 1 : Écrire les tests qui doivent échouer**

Crée `__tests__/unit/check-migration-safety.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
// @ts-expect-error — .mjs import from TS test
import { analyze, PATTERNS } from "../../scripts/check-migration-safety.mjs";

describe("check-migration-safety — analyze()", () => {
  it("passes a safe ADD COLUMN migration", () => {
    const sql = `ALTER TABLE products ADD COLUMN description TEXT;`;
    const { violations, bypass } = analyze(sql);
    expect(violations).toEqual([]);
    expect(bypass).toBeNull();
  });

  it("blocks DROP COLUMN", () => {
    const sql = `ALTER TABLE products DROP COLUMN description;`;
    const { violations } = analyze(sql);
    expect(violations).toHaveLength(1);
    expect(violations[0].patternId).toBe("drop-column");
    expect(violations[0].level).toBe("error");
  });

  it("blocks DROP TABLE", () => {
    const sql = `DROP TABLE obsolete_table;`;
    const { violations } = analyze(sql);
    expect(violations.map((v: { patternId: string }) => v.patternId)).toContain("drop-table");
  });

  it("blocks RENAME COLUMN", () => {
    const sql = `ALTER TABLE users RENAME COLUMN old_name TO new_name;`;
    const { violations } = analyze(sql);
    expect(violations.map((v: { patternId: string }) => v.patternId)).toContain("rename-column");
  });

  it("blocks ALTER COLUMN NOT NULL without DEFAULT", () => {
    const sql = `ALTER TABLE products ALTER COLUMN price SET NOT NULL;`;
    const { violations } = analyze(sql);
    expect(violations.map((v: { patternId: string }) => v.patternId)).toContain(
      "alter-not-null-no-default"
    );
  });

  it("allows ALTER COLUMN NOT NULL with DEFAULT on same statement", () => {
    const sql = `ALTER TABLE products ALTER COLUMN price SET NOT NULL DEFAULT 0;`;
    const { violations } = analyze(sql);
    expect(violations.map((v: { patternId: string }) => v.patternId)).not.toContain(
      "alter-not-null-no-default"
    );
  });

  it("blocks DROP INDEX on an index whose name contains 'unique' (Drizzle convention)", () => {
    // Drizzle generates names like `categories_slug_unique` for unique indexes.
    // SQLite's DROP INDEX syntax doesn't include a UNIQUE keyword, so we match on name.
    const sql = `DROP INDEX categories_slug_unique;`;
    const { violations } = analyze(sql);
    const hit = violations.find(
      (v: { patternId: string }) => v.patternId === "drop-unique-index"
    );
    expect(hit).toBeDefined();
    expect(hit!.level).toBe("error");
  });

  it("flags plain (non-unique) DROP INDEX as warning only", () => {
    const sql = `DROP INDEX idx_products_created_at;`;
    const { violations } = analyze(sql);
    const errors = violations.filter(
      (v: { level: string }) => v.level === "error"
    );
    const warnings = violations.filter(
      (v: { level: string }) => v.level === "warning"
    );
    expect(errors).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("honors the bypass marker and clears violations", () => {
    const sql = `-- migration-safety: acknowledged reason="dropped after PR #42 stopped using"
ALTER TABLE products DROP COLUMN old_field;`;
    const { violations, bypass } = analyze(sql);
    expect(violations).toEqual([]);
    expect(bypass).toBe("dropped after PR #42 stopped using");
  });

  it("is case-insensitive on SQL keywords", () => {
    const sql = `alter table products drop column foo;`;
    const { violations } = analyze(sql);
    expect(violations.map((v: { patternId: string }) => v.patternId)).toContain("drop-column");
  });

  it("exports the expected pattern IDs", () => {
    const ids = PATTERNS.map((p: { id: string }) => p.id).sort();
    expect(ids).toEqual(
      [
        "alter-not-null-no-default",
        "drop-column",
        "drop-index",
        "drop-table",
        "drop-unique-index",
        "rename-column",
      ].sort()
    );
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent avec un script vide**

Si Task 1.1 n'est pas encore fait, le tests doivent échouer à cause d'import manquant. Sinon, ils passent. Run :

```bash
npx vitest run __tests__/unit/check-migration-safety.test.ts
```

Attendu : **PASS** si Task 1.1 est déjà fait, sinon **FAIL** sur import.

- [ ] **Step 3 : Si les tests passent, test manuel en ajoutant un DROP COLUMN**

Crée un fichier temporaire `/tmp/test-migration.sql` :

```sql
ALTER TABLE foo DROP COLUMN bar;
```

Run :

```bash
node scripts/check-migration-safety.mjs --files /tmp/test-migration.sql
echo "Exit code: $?"
```

Attendu : message d'erreur `drop-column`, exit code `1`.

Puis ajoute le bypass :

```sql
-- migration-safety: acknowledged reason="test"
ALTER TABLE foo DROP COLUMN bar;
```

Re-run :

```bash
node scripts/check-migration-safety.mjs --files /tmp/test-migration.sql
echo "Exit code: $?"
```

Attendu : message "bypass accepté", exit code `0`.

Nettoie : `rm /tmp/test-migration.sql`.

- [ ] **Step 4 : Commit**

```bash
git add scripts/check-migration-safety.mjs __tests__/unit/check-migration-safety.test.ts
git commit -m "feat(ci): add migration safety lint script with tests"
```

---

### Task 1.3 : Intégrer dans le pre-commit hook

**Files :**
- Modify : `.husky/pre-commit`

- [ ] **Step 1 : Ajouter le check dans le hook**

Remplace `.husky/pre-commit` :

```bash
#!/bin/sh

echo "🔍 Vérification des types TypeScript..."
npx tsc --noEmit
TSC_EXIT=$?

echo ""
echo "🔍 Vérification du linting ESLint..."
npm run lint
LINT_EXIT=$?

echo ""
echo "🧪 Exécution des tests..."
npm test
TEST_EXIT=$?

echo ""
echo "🛡  Lint des migrations D1 (expand/contract)..."
PRE_COMMIT=1 node scripts/check-migration-safety.mjs
MIGRATION_EXIT=$?

if [ $TSC_EXIT -ne 0 ] || [ $LINT_EXIT -ne 0 ] || [ $TEST_EXIT -ne 0 ] || [ $MIGRATION_EXIT -ne 0 ]; then
  echo ""
  echo "❌ =============================================="
  echo "❌  COMMIT BLOQUÉ"
  echo "❌ =============================================="
  echo ""
  if [ $TSC_EXIT -ne 0 ]; then
    echo "  → Des erreurs TypeScript ont été détectées."
  fi
  if [ $LINT_EXIT -ne 0 ]; then
    echo "  → Des erreurs ESLint ont été détectées."
  fi
  if [ $TEST_EXIT -ne 0 ]; then
    echo "  → Des tests ont échoué."
  fi
  if [ $MIGRATION_EXIT -ne 0 ]; then
    echo "  → Migration D1 non-safe détectée (voir messages ci-dessus)."
  fi
  echo ""
  echo "  Corrigez ces erreurs avant de commit."
  echo "  NE PAS utiliser --no-verify pour bypasser."
  echo ""
  exit 1
fi

echo ""
echo "✅ Types, lint, tests et migrations OK — commit autorisé."
```

- [ ] **Step 2 : Test manuel du hook**

Crée un fichier test `drizzle/9999_test_unsafe.sql` avec `DROP COLUMN`, stage-le, essaie de commit :

```bash
echo "ALTER TABLE foo DROP COLUMN bar;" > drizzle/9999_test_unsafe.sql
git add drizzle/9999_test_unsafe.sql
git commit -m "test" # should FAIL on migration safety
```

Attendu : commit bloqué avec message `drop-column`.

Nettoie :

```bash
git reset HEAD drizzle/9999_test_unsafe.sql
rm drizzle/9999_test_unsafe.sql
```

- [ ] **Step 3 : Commit le hook**

```bash
git add .husky/pre-commit
git commit -m "feat(ci): run migration safety lint in pre-commit hook"
```

---

### Task 1.4 : Intégrer dans la CI

**Files :**
- Modify : `.github/workflows/ci.yml`

- [ ] **Step 1 : Ajouter le step de lint migration dans ci.yml**

Remplace `.github/workflows/ci.yml` :

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed for migration-safety diff base

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test

      - name: Migration safety lint
        run: node scripts/check-migration-safety.mjs
```

- [ ] **Step 2 : Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat(ci): run migration safety lint in CI"
```

---

## Phase 2 — Conventional Commits avec commitlint

### Task 2.1 : Installer commitlint et config

**Files :**
- Create : `commitlint.config.js`
- Modify : `package.json`

- [ ] **Step 1 : Installer les devDependencies**

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

- [ ] **Step 2 : Créer `commitlint.config.js`**

```javascript
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "storefront",
        "admin",
        "whatsapp",
        "auth",
        "db",
        "seo",
        "claude",
        "ci",
        "deps",
        "release",
      ],
    ],
  },
};
```

- [ ] **Step 3 : Ajouter le script `commitlint` à `package.json`**

Dans `package.json`, ajouter dans `scripts` (après `"lint": "eslint"`) :

```json
"commitlint": "commitlint --edit"
```

- [ ] **Step 4 : Test manuel**

Simule un commit message valide :

```bash
echo "feat(admin): test message" | npx commitlint
echo "Exit code: $?"  # doit être 0
```

Simule un commit message invalide :

```bash
echo "update stuff" | npx commitlint
echo "Exit code: $?"  # doit être non-zéro
```

- [ ] **Step 5 : Commit**

```bash
git add commitlint.config.js package.json package-lock.json
git commit -m "feat(ci): add commitlint with Conventional Commits config"
```

---

### Task 2.2 : Hook Husky `commit-msg`

**Files :**
- Create : `.husky/commit-msg`

- [ ] **Step 1 : Créer le hook**

```bash
#!/bin/sh
npx --no -- commitlint --edit "$1"
```

- [ ] **Step 2 : Rendre exécutable**

```bash
chmod +x .husky/commit-msg
```

- [ ] **Step 3 : Test manuel**

```bash
git commit --allow-empty -m "bad commit message"
# doit échouer avec message commitlint
git commit --allow-empty -m "chore: test commit"
# doit réussir
```

Si le test a créé un commit "test commit", le retirer :

```bash
git reset HEAD~1
```

- [ ] **Step 4 : Commit**

```bash
git add .husky/commit-msg
git commit -m "feat(ci): enforce Conventional Commits via Husky commit-msg hook"
```

---

### Task 2.3 : Ouvrir la PR A

**Files :** aucun.

- [ ] **Step 1 : Push la branche**

```bash
git push -u origin feat/release-pipeline-phase-1
```

- [ ] **Step 2 : Créer la PR**

```bash
gh pr create --title "feat(ci): migration safety lint + Conventional Commits enforcement" --body "$(cat <<'EOF'
## Summary

- Lint des migrations D1 (expand/contract) en pre-commit + CI (`scripts/check-migration-safety.mjs`)
- Commitlint + Husky `commit-msg` pour enforcer les Conventional Commits (prérequis `release-please`)
- Bypass marker documenté : `-- migration-safety: acknowledged reason="..."`

Phase 1+2 du plan `docs/superpowers/plans/2026-04-14-release-pipeline.md`.

## Test plan

- [ ] CI verte
- [ ] Tester localement : `echo "ALTER TABLE foo DROP COLUMN bar;" > drizzle/9999.sql && git add drizzle/9999.sql && git commit -m "test: should fail"` → le commit doit être bloqué
- [ ] Tester localement : `git commit --allow-empty -m "bad message"` → commitlint doit bloquer

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**⚠ Attendre l'approbation utilisateur avant de merger (mémoire projet).**

Une fois la PR A mergée, revenir sur main puis créer la branche de Phase 3+4+5.

---

## Phase 3 — Pipeline Cloudflare Versions (deploy / promote / rollback)

### Task 3.1 : Créer la branche et préparer

**Files :** aucun.

- [ ] **Step 1 : Sync main et créer la branche**

```bash
git checkout main
git pull
git checkout -b feat/release-pipeline-phase-3
```

---

### Task 3.2 : Refactor `deploy.yml` — upload version + canary 10%

**Files :**
- Modify : `.github/workflows/deploy.yml`

- [ ] **Step 1 : Remplacer entièrement `deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy
  cancel-in-progress: true

jobs:
  ci:
    name: Lint & Type Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test

      - name: Migration safety lint
        run: node scripts/check-migration-safety.mjs

  deploy:
    name: Deploy to Cloudflare (canary 10%)
    needs: ci
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Run D1 migrations (expand phase)
        run: bash scripts/migrate.sh --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Build worker
        run: npm run build:worker
        env:
          NEXT_PUBLIC_R2_URL: ${{ vars.NEXT_PUBLIC_R2_URL }}
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: ${{ vars.NEXT_PUBLIC_TURNSTILE_SITE_KEY }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Capture currently-active version (before upload)
        id: current
        run: |
          # Fetch the current deployment. If no deployment exists yet (fresh worker),
          # leave previous_version_id empty — we'll treat as bootstrap.
          DEPLOYMENTS_JSON=$(npx wrangler deployments list --json 2>/dev/null || echo "[]")
          # Pick the version_id currently at 100% (or the first version of the most
          # recent deployment if the structure differs between wrangler versions).
          PREV_ID=$(echo "$DEPLOYMENTS_JSON" \
            | jq -r 'if (. | length) == 0 then "" else (.[0].versions // [] | map(select((.percentage // 0) == 100)) | .[0].version_id // "") end')
          echo "previous_version_id=${PREV_ID}" >> "$GITHUB_OUTPUT"
          if [ -z "$PREV_ID" ]; then
            echo "No active deployment found — will bootstrap at 100%."
          else
            echo "Previous active version: $PREV_ID"
          fi
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Upload new version
        id: upload
        run: |
          SHORT_SHA="${GITHUB_SHA:0:7}"
          COMMIT_MSG=$(git log -1 --pretty=%s)
          OUTPUT=$(npx wrangler versions upload \
            --tag "sha-${SHORT_SHA}" \
            --message "${COMMIT_MSG}" 2>&1)
          echo "$OUTPUT"
          # Parse version ID (wrangler prints "Worker Version ID: <uuid>")
          VERSION_ID=$(echo "$OUTPUT" | grep -oE "Worker Version ID:[[:space:]]+[a-f0-9-]+" | awk '{print $NF}')
          if [ -z "$VERSION_ID" ]; then
            echo "ERROR: could not parse version ID from wrangler output"
            exit 1
          fi
          echo "version_id=$VERSION_ID" >> "$GITHUB_OUTPUT"
          echo "short_sha=$SHORT_SHA" >> "$GITHUB_OUTPUT"
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Determine deploy strategy (canary vs bootstrap)
        id: strategy
        run: |
          if [ -z "${{ steps.current.outputs.previous_version_id }}" ]; then
            echo "mode=bootstrap" >> "$GITHUB_OUTPUT"
          else
            echo "mode=canary" >> "$GITHUB_OUTPUT"
          fi

      - name: Deploy at 100% (bootstrap)
        if: steps.strategy.outputs.mode == 'bootstrap'
        run: |
          npx wrangler versions deploy "${{ steps.upload.outputs.version_id }}@100%" --yes
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Deploy at 10% (canary)
        if: steps.strategy.outputs.mode == 'canary'
        run: |
          npx wrangler versions deploy \
            "${{ steps.upload.outputs.version_id }}@10%" \
            "${{ steps.current.outputs.previous_version_id }}@90%" --yes
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Seed hero LCP preload KV (bootstrap only)
        if: steps.strategy.outputs.mode == 'bootstrap'
        run: node scripts/seed-hero-preload.js
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          NEXT_PUBLIC_R2_URL: ${{ vars.NEXT_PUBLIC_R2_URL }}

      - name: Create pending-promotion issue (canary)
        if: steps.strategy.outputs.mode == 'canary'
        uses: actions/github-script@v7
        with:
          script: |
            const versionId = "${{ steps.upload.outputs.version_id }}";
            const shortSha = "${{ steps.upload.outputs.short_sha }}";
            const body = [
              `New version deployed at **10%** of traffic.`,
              ``,
              `- Version ID : \`${versionId}\``,
              `- Commit : ${context.sha}`,
              `- Short SHA : \`${shortSha}\``,
              ``,
              `**Promote to 100%** :`,
              `Actions → [promote.yml](../../actions/workflows/promote.yml) → Run workflow with \`version_id=${versionId}\`.`,
              ``,
              `**Rollback** :`,
              `Actions → [rollback.yml](../../actions/workflows/rollback.yml).`,
            ].join("\n");
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Pending promotion — sha-${shortSha}`,
              body,
              labels: ["release-pipeline", "pending-promotion"],
            });
```

- [ ] **Step 2 : Validation YAML syntaxe**

```bash
npx yaml-lint .github/workflows/deploy.yml 2>&1 || true
# si yaml-lint absent, au moins parser : python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"
```

- [ ] **Step 3 : Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat(ci): refactor deploy.yml for Cloudflare Versions canary 10/90"
```

---

### Task 3.3 : Créer `promote.yml`

**Files :**
- Create : `.github/workflows/promote.yml`

- [ ] **Step 1 : Créer le workflow**

```yaml
name: Promote to 100%

on:
  workflow_dispatch:
    inputs:
      version_id:
        description: "Cloudflare Worker Version ID (empty = auto-detect latest non-100%)"
        required: false
        default: ""

jobs:
  promote:
    name: Promote version to 100% of traffic
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Resolve target version_id
        id: resolve
        run: |
          INPUT="${{ github.event.inputs.version_id }}"
          if [ -n "$INPUT" ]; then
            echo "version_id=$INPUT" >> "$GITHUB_OUTPUT"
          else
            # Pick the most recently uploaded version that isn't already at 100%
            VID=$(npx wrangler versions list --json \
              | jq -r '[.[] | select((.deployed_percentage // 0) < 100)] | sort_by(.created_on) | last | .id')
            if [ -z "$VID" ] || [ "$VID" = "null" ]; then
              echo "ERROR: no non-100% version found to promote"
              exit 1
            fi
            echo "version_id=$VID" >> "$GITHUB_OUTPUT"
          fi
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Deploy at 100%
        run: |
          npx wrangler versions deploy "${{ steps.resolve.outputs.version_id }}@100%" --yes
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Seed hero LCP preload KV
        run: node scripts/seed-hero-preload.js
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          NEXT_PUBLIC_R2_URL: ${{ vars.NEXT_PUBLIC_R2_URL }}

      - name: Close pending-promotion issues
        uses: actions/github-script@v7
        with:
          script: |
            const versionId = "${{ steps.resolve.outputs.version_id }}";
            const issues = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: "pending-promotion",
              state: "open",
            });
            for (const issue of issues.data) {
              if (issue.body && issue.body.includes(versionId)) {
                await github.rest.issues.createComment({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: issue.number,
                  body: `Promoted to 100% by @${context.actor}.`,
                });
                await github.rest.issues.update({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: issue.number,
                  state: "closed",
                });
              }
            }
```

- [ ] **Step 2 : Commit**

```bash
git add .github/workflows/promote.yml
git commit -m "feat(ci): add promote.yml workflow for 10% → 100% promotion"
```

---

### Task 3.4 : Créer `rollback.yml`

**Files :**
- Create : `.github/workflows/rollback.yml`

- [ ] **Step 1 : Créer le workflow**

```yaml
name: Rollback

on:
  workflow_dispatch:
    inputs:
      version_id:
        description: "Cloudflare Worker Version ID to rollback to"
        required: true
      reason:
        description: "Reason for rollback (short, appears in audit trail)"
        required: true

jobs:
  rollback:
    name: Rollback Cloudflare Worker to specified version
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Rollback
        run: |
          npx wrangler rollback \
            --version-id "${{ github.event.inputs.version_id }}" \
            --message "Rollback by ${{ github.actor }}: ${{ github.event.inputs.reason }}"
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Create post-rollback investigation issue
        uses: actions/github-script@v7
        with:
          script: |
            const versionId = "${{ github.event.inputs.version_id }}";
            const reason = ${{ toJSON(github.event.inputs.reason) }};
            const actor = "${{ github.actor }}";
            const body = [
              `**Rollback executed** to version \`${versionId}\`.`,
              ``,
              `- Triggered by : @${actor}`,
              `- Reason : ${reason}`,
              `- Timestamp : ${new Date().toISOString()}`,
              ``,
              `## Checklist`,
              ``,
              `- [ ] Identify root cause`,
              `- [ ] Open fix PR`,
              `- [ ] Verify expand/contract discipline was respected (no DB inconsistency)`,
              `- [ ] Close this issue when resolved`,
            ].join("\n");
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Post-rollback investigation — ${new Date().toISOString().slice(0, 10)}`,
              body,
              labels: ["release-pipeline", "post-rollback"],
            });
```

- [ ] **Step 2 : Commit**

```bash
git add .github/workflows/rollback.yml
git commit -m "feat(ci): add rollback.yml workflow"
```

---

## Phase 4 — Wrappers locaux

### Task 4.1 : `scripts/rollback.sh`

**Files :**
- Create : `scripts/rollback.sh`

- [ ] **Step 1 : Créer le script**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Interactive rollback wrapper.
# Lists the 10 most recent Cloudflare Worker versions, prompts for a version ID,
# and executes wrangler rollback.
#
# Usage: npm run rollback

echo "🔄 Fetching recent versions..."
npx wrangler versions list --json \
  | jq -r '.[0:10] | map([.id, (.annotations."workers/triggered_by" // "unknown"), (.annotations."workers/tag" // "-"), .created_on] | @tsv) | .[]' \
  | awk -F'\t' 'BEGIN { printf "%-38s %-12s %-20s %s\n", "VERSION ID", "TRIGGER", "TAG", "CREATED"; printf "%-38s %-12s %-20s %s\n", "----------", "-------", "---", "-------" } { printf "%-38s %-12s %-20s %s\n", $1, $2, $3, $4 }'

echo ""
read -r -p "Enter version ID to rollback to: " VERSION_ID
if [ -z "$VERSION_ID" ]; then
  echo "❌ No version ID provided. Aborting."
  exit 1
fi

read -r -p "Reason for rollback (required): " REASON
if [ -z "$REASON" ]; then
  echo "❌ Reason required. Aborting."
  exit 1
fi

read -r -p "⚠  Confirm rollback to $VERSION_ID? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

npx wrangler rollback --version-id "$VERSION_ID" --message "Local rollback: $REASON"
echo "✅ Rollback executed. Remember to open a GitHub issue documenting the incident."
```

- [ ] **Step 2 : Rendre exécutable**

```bash
chmod +x scripts/rollback.sh
```

- [ ] **Step 3 : Commit**

```bash
git add scripts/rollback.sh
git commit -m "feat(scripts): add interactive rollback wrapper"
```

---

### Task 4.2 : `scripts/promote.sh`

**Files :**
- Create : `scripts/promote.sh`

- [ ] **Step 1 : Créer le script**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Interactive promote wrapper.
# Shows currently-deployed versions with their traffic split, then promotes
# a chosen version to 100%.
#
# Usage: npm run promote

echo "🚀 Current deployed versions (and traffic split)..."
npx wrangler deployments list --json \
  | jq -r '.[0].versions[] | [.version_id, (.percentage // 0 | tostring + "%"), .annotations."workers/tag" // "-"] | @tsv' \
  | awk -F'\t' 'BEGIN { printf "%-38s %-8s %s\n", "VERSION ID", "TRAFFIC", "TAG"; printf "%-38s %-8s %s\n", "----------", "-------", "---" } { printf "%-38s %-8s %s\n", $1, $2, $3 }'

echo ""
echo "📋 Recent uploaded versions (may include non-deployed)..."
npx wrangler versions list --json \
  | jq -r '.[0:5] | map([.id, .annotations."workers/tag" // "-", .created_on] | @tsv) | .[]' \
  | awk -F'\t' 'BEGIN { printf "%-38s %-20s %s\n", "VERSION ID", "TAG", "CREATED" } { printf "%-38s %-20s %s\n", $1, $2, $3 }'

echo ""
read -r -p "Enter version ID to promote to 100%: " VERSION_ID
if [ -z "$VERSION_ID" ]; then
  echo "❌ No version ID provided. Aborting."
  exit 1
fi

read -r -p "⚠  Confirm promote $VERSION_ID to 100%? [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

npx wrangler versions deploy "${VERSION_ID}@100%" --yes

echo ""
echo "🎨 Seeding hero LCP preload KV..."
node scripts/seed-hero-preload.js

echo "✅ Promotion complete."
```

- [ ] **Step 2 : Rendre exécutable**

```bash
chmod +x scripts/promote.sh
```

- [ ] **Step 3 : Commit**

```bash
git add scripts/promote.sh
git commit -m "feat(scripts): add interactive promote wrapper"
```

---

### Task 4.3 : Ajouter les npm scripts

**Files :**
- Modify : `package.json`

- [ ] **Step 1 : Ajouter les scripts**

Dans `package.json`, section `scripts`, ajouter :

```json
"rollback": "bash scripts/rollback.sh",
"promote": "bash scripts/promote.sh",
"versions:list": "wrangler versions list",
"check:migrations": "node scripts/check-migration-safety.mjs"
```

(Le script `commitlint` a déjà été ajouté en Phase 2.)

- [ ] **Step 2 : Vérifier**

```bash
npm run | grep -E "rollback|promote|versions|check:migrations"
```

- [ ] **Step 3 : Commit**

```bash
git add package.json
git commit -m "feat(scripts): add rollback/promote/versions:list/check:migrations npm scripts"
```

---

## Phase 5 — release-please

### Task 5.1 : Config release-please

**Files :**
- Create : `release-please-config.json`
- Create : `.release-please-manifest.json`

- [ ] **Step 1 : Créer `release-please-config.json`**

```json
{
  "release-type": "node",
  "packages": {
    ".": {
      "release-type": "node",
      "package-name": "netereka",
      "changelog-path": "CHANGELOG.md",
      "include-component-in-tag": false,
      "bump-minor-pre-major": true,
      "bump-patch-for-minor-pre-major": true
    }
  },
  "changelog-sections": [
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Bug Fixes" },
    { "type": "perf", "section": "Performance" },
    { "type": "refactor", "section": "Refactoring" },
    { "type": "docs", "section": "Documentation", "hidden": false },
    { "type": "chore", "hidden": true },
    { "type": "ci", "hidden": true },
    { "type": "test", "hidden": true },
    { "type": "style", "hidden": true }
  ]
}
```

- [ ] **Step 2 : Créer `.release-please-manifest.json`**

```json
{
  ".": "1.0.0"
}
```

- [ ] **Step 3 : Commit**

```bash
git add release-please-config.json .release-please-manifest.json
git commit -m "feat(release): add release-please config and manifest"
```

---

### Task 5.2 : Workflow `release-please.yml`

**Files :**
- Create : `.github/workflows/release-please.yml`

- [ ] **Step 1 : Créer le workflow**

```yaml
name: Release Please

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
```

- [ ] **Step 2 : Commit**

```bash
git add .github/workflows/release-please.yml
git commit -m "feat(release): add release-please workflow"
```

---

### Task 5.3 : Ouvrir la PR B

**Files :** aucun.

- [ ] **Step 1 : Push**

```bash
git push -u origin feat/release-pipeline-phase-3
```

- [ ] **Step 2 : Créer la PR**

```bash
gh pr create --title "feat(ci): Cloudflare Versions pipeline + release-please" --body "$(cat <<'EOF'
## Summary

- Refonte `deploy.yml` pour upload de version + canary 10/90 (bootstrap 100% au 1er run)
- Nouveau `promote.yml` (workflow_dispatch) pour passer de 10% à 100%
- Nouveau `rollback.yml` (workflow_dispatch) pour rollback instantané
- Wrappers locaux `scripts/rollback.sh` + `scripts/promote.sh`
- Nouveaux npm scripts : `rollback`, `promote`, `versions:list`, `check:migrations`
- `release-please` + workflow : Release PR maintenue sur chaque push main, bump SemVer + CHANGELOG auto

Phase 3+4+5 du plan `docs/superpowers/plans/2026-04-14-release-pipeline.md`.

## Test plan

- [ ] CI verte
- [ ] Après merge, vérifier que le premier run de `deploy.yml` s'exécute en mode **bootstrap** (100% direct, pas de canary car pas de previous version)
- [ ] Au 2e merge, vérifier le mode **canary** (10/90) — vérifier la création de l'issue "Pending promotion"
- [ ] Tester `promote.yml` via Actions → Run workflow → vérifier 100% + KV hero seed
- [ ] Tester en local : `npm run versions:list` (retourne du JSON)
- [ ] `release-please` ouvre une Release PR si au moins un commit `feat:` ou `fix:` est présent

## Notes

- Rétention Cloudflare Versions vérifiée : **[TO FILL from Task 0.1 conclusion]**
- Permissions token vérifiées : **[TO FILL from Task 0.1 step 4]**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**⚠ Attendre l'approbation utilisateur avant de merger.**

---

## Phase 6 — CD du Worker WhatsApp

### Task 6.1 : Créer la branche

**Files :** aucun.

- [ ] **Step 1 : Sync main, nouvelle branche**

```bash
git checkout main
git pull
git checkout -b feat/release-pipeline-whatsapp-cd
```

---

### Task 6.2 : Workflow `deploy-whatsapp.yml`

**Files :**
- Create : `.github/workflows/deploy-whatsapp.yml`

- [ ] **Step 1 : Créer le workflow**

```yaml
name: Deploy WhatsApp Worker

on:
  push:
    branches: [main]
    paths:
      - "workers/whatsapp/**"
      - ".github/workflows/deploy-whatsapp.yml"
  workflow_dispatch:

concurrency:
  group: deploy-whatsapp
  cancel-in-progress: true

jobs:
  deploy:
    name: Deploy WhatsApp Worker to Cloudflare
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Deploy
        run: npx wrangler deploy --config workers/whatsapp/wrangler.jsonc
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Smoke check — webhook responds 200 on HEAD
        env:
          WHATSAPP_WORKER_URL: ${{ vars.WHATSAPP_WORKER_URL }}
        run: |
          if [ -z "$WHATSAPP_WORKER_URL" ]; then
            echo "⚠  WHATSAPP_WORKER_URL not set, skipping smoke check."
            exit 0
          fi
          # Retry 3 times with backoff (Cloudflare propagation can take a few seconds)
          for i in 1 2 3; do
            CODE=$(curl -sI -o /dev/null -w "%{http_code}" -X HEAD "${WHATSAPP_WORKER_URL}/webhook" || echo "000")
            if [ "$CODE" = "200" ] || [ "$CODE" = "405" ]; then
              # 200 or 405 (method not allowed on HEAD) both indicate worker is alive
              echo "✅ Smoke check OK (HTTP $CODE)"
              exit 0
            fi
            echo "Attempt $i: HTTP $CODE, retrying in 5s..."
            sleep 5
          done
          echo "❌ Smoke check failed after 3 attempts"
          exit 1
```

- [ ] **Step 2 : Commit**

```bash
git add .github/workflows/deploy-whatsapp.yml
git commit -m "feat(ci): add WhatsApp Worker CD workflow (path-filtered)"
```

---

## Phase 7 — Documentation et validation

### Task 7.1 : Mettre à jour `CLAUDE.md`

**Files :**
- Modify : `CLAUDE.md`

- [ ] **Step 1 : Ajouter la section "Release pipeline"**

Dans `CLAUDE.md`, ajouter après la section "WhatsApp Integration" (avant "Reference Documents") :

```markdown
## Release Pipeline

The deploy pipeline decouples three concepts: **deploy** (each merge to `main` → new Cloudflare Worker version at 10% traffic), **promote** (manual → 100%), **release** (merging a release-please PR → SemVer tag + CHANGELOG).

### Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | PR + push main | tsc + eslint + vitest + migration-safety lint |
| `deploy.yml` | push main | migrate D1 → build → upload version → deploy 10% (or 100% on bootstrap) |
| `promote.yml` | `workflow_dispatch` | promote a version to 100% + seed hero KV |
| `rollback.yml` | `workflow_dispatch` (with `version_id`) | rollback to a previous version |
| `deploy-whatsapp.yml` | push main filtered `workers/whatsapp/**` | deploy the WhatsApp Worker (no canary) |
| `release-please.yml` | push main | maintain a Release PR (SemVer bump + CHANGELOG) |

### Shipping a feature

1. Branch `feat/...` → PR → CI passes → merge
2. `deploy.yml` runs: migrate D1 → upload version → deploy at **10%**
3. A "Pending promotion" issue is created with the `version_id`
4. Observe 5-15 min (Cloudflare dashboard, logs)
5. Promote: Actions → `promote.yml` → Run workflow
6. If broken: Actions → `rollback.yml` with the previous `version_id`, or `npm run rollback` locally

### Migration safety (expand/contract)

Migrations run **before** deploy. During the 10/90 split, both old and new code share the same D1.

**Always backward-compatible.** `scripts/check-migration-safety.mjs` blocks `DROP COLUMN`, `DROP TABLE`, `RENAME COLUMN`, `ALTER COLUMN ... NOT NULL` without `DEFAULT`, and `DROP UNIQUE INDEX`. Runs in pre-commit and CI.

For intentional unsafe migrations (e.g. dropping a column already unused in code), add inside the SQL file:

```sql
-- migration-safety: acknowledged reason="dropped after PR #N stopped using"
```

Unsafe changes should be split into 2-3 PRs (expand → migrate code → contract).

### Conventional Commits

Enforced via `commitlint` + Husky `commit-msg` hook. Allowed types: `feat`, `fix`, `perf`, `refactor`, `docs`, `chore`, `ci`, `test`, `style`. Allowed scopes: `storefront`, `admin`, `whatsapp`, `auth`, `db`, `seo`, `claude`, `ci`, `deps`, `release`.

### Releases (SemVer + CHANGELOG)

`release-please` maintains an open "Release PR" on `main`. When merged, it creates a `vX.Y.Z` tag + GitHub Release + `CHANGELOG.md` entry based on Conventional Commits accumulated since the last release. Deploys to Cloudflare happen at each merge regardless; the SemVer tag is a "this commit is an official version" marker.

### Local wrappers

- `npm run rollback` — interactive: lists last 10 versions, prompts, rolls back
- `npm run promote` — interactive: shows current split, prompts, promotes
- `npm run versions:list` — lists all Cloudflare Worker versions
- `npm run check:migrations` — runs the migration safety lint locally

### Cloudflare Versions retention

**[TO FILL from Task 0.1]** — if limited, fallback is `git checkout <tag> && npm run deploy`.
```

- [ ] **Step 2 : Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): document the release pipeline (deploy/promote/release)"
```

---

### Task 7.3 : Ouvrir la PR C

**Files :** aucun.

- [ ] **Step 1 : Push**

```bash
git push -u origin feat/release-pipeline-whatsapp-cd
```

- [ ] **Step 2 : Créer la PR**

```bash
gh pr create --title "feat(ci): WhatsApp Worker CD + release pipeline docs" --body "$(cat <<'EOF'
## Summary

- Nouveau workflow `deploy-whatsapp.yml` : déploie le Worker WhatsApp sur push main quand `workers/whatsapp/**` change + disponible en `workflow_dispatch`
- Smoke check HEAD au webhook post-deploy
- Documentation complète du pipeline dans `CLAUDE.md`

Phase 6+7 du plan `docs/superpowers/plans/2026-04-14-release-pipeline.md`.

## Test plan

- [ ] CI verte
- [ ] Après merge, modifier un fichier anodin dans `workers/whatsapp/` et push → `deploy-whatsapp.yml` doit se déclencher
- [ ] Modifier un fichier hors `workers/whatsapp/` → `deploy-whatsapp.yml` ne doit PAS se déclencher
- [ ] Tester `workflow_dispatch` manuel
- [ ] `CLAUDE.md` documente tous les runbooks

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**⚠ Attendre l'approbation utilisateur avant de merger.**

---

### Task 7.4 : Validation end-to-end (post-merge toutes PRs)

**Files :** aucun (verification passive).

- [ ] **Step 1 : Observer le premier deploy.yml en mode canary**

Après merge de la PR B, le premier push sur main déclenche `deploy.yml`. Vérifier dans Actions :

- Le step "Determine deploy strategy" affiche `mode=bootstrap` (premier deploy avec ce pipeline, <2 versions) OU `mode=canary` (≥2 versions, split 10/90)
- En mode canary : une issue "Pending promotion" est créée avec le `version_id`

- [ ] **Step 2 : Tester la promotion**

Actions → `Promote to 100%` → Run workflow. Sans input `version_id`, doit auto-détecter la dernière version non-100%. Vérifier :

- `wrangler versions deploy @100%` réussit
- Le KV hero est re-seed
- L'issue "Pending promotion" est fermée avec un commentaire

- [ ] **Step 3 : Tester le rollback (dry-run)**

Identifier un `version_id` précédent via `npm run versions:list`. Actions → `Rollback` → Run workflow avec ce `version_id` et `reason="e2e test"`. Vérifier :

- `wrangler rollback` réussit
- Une issue "Post-rollback investigation" est créée

**Important :** ce test va vraiment rollback la prod. À faire un moment de faible trafic, et re-promouvoir la version courante juste après via `promote.yml`.

- [ ] **Step 4 : Tester release-please**

S'il y a des commits `feat:` ou `fix:` depuis la PR 5.3, `release-please.yml` devrait avoir ouvert une "Release PR" (ex: `chore: release main`) sur `main`. Vérifier :

- La PR existe
- Elle bump `package.json` version
- Elle met à jour `CHANGELOG.md`

NE PAS merger cette PR dans le cadre de la validation — la laisser ouverte pour la première release réelle.

- [ ] **Step 5 : Tester le CD WhatsApp**

Faire un changement anodin dans `workers/whatsapp/README.md` (ou créer s'il n'existe pas), commit + push sur une branche → PR → merge. Vérifier que `deploy-whatsapp.yml` se déclenche et que le smoke check passe.

- [ ] **Step 6 : Documenter la conclusion**

Créer une issue "Release pipeline — validation report" récapitulant :
- Les 5 tests ci-dessus et leur résultat
- La rétention Cloudflare Versions observée
- Les ajustements éventuels à faire

Fermer les tâches du plan une fois tous les steps validés.

---

## Self-review (auto-check à effectuer avant de commencer l'implémentation)

**Spec coverage :** chaque section de la spec est couverte par au moins une task :
- ✓ Topologie Versions/Gradual → Phase 3 (deploy/promote/rollback)
- ✓ Canary 10/90 manuel → Task 3.2 (deploy.yml @10%) + Task 3.3 (promote.yml)
- ✓ Migrations expand/contract + lint → Phase 1 (script + hook + CI)
- ✓ Versioning release-please + Conventional Commits → Phase 2 (commitlint) + Phase 5 (release-please)
- ✓ Worker WhatsApp CD path-filtered → Phase 6
- ✓ Rollback CLI + workflow → Tasks 3.4 + 4.1
- ✓ Promote workflow → Task 3.3
- ✓ Hero KV preload seulement à 100% → Task 3.2 (bootstrap only) + Task 3.3 (promote always seeds)
- ✓ Runbooks + doc → Task 7.1
- ✓ Bootstrap handling → Task 3.2 (mode=bootstrap)
- ✓ Rétention Versions → Task 0.1 + note dans 7.1

**Placeholder scan :** deux `[TO FILL from Task 0.1]` volontaires dans la description de PR B et dans CLAUDE.md — à renseigner au moment de rédiger la PR B / de modifier CLAUDE.md. Pas de TBD caché.

**Type consistency :**
- `version_id` (snake_case) cohérent dans tous les workflows et scripts.
- `steps.upload.outputs.version_id` (new) et `steps.current.outputs.previous_version_id` (captured before upload) nommés cohéremment. `steps.strategy.outputs.mode` est `bootstrap` ou `canary`.
- Nom des patterns IDs dans `check-migration-safety.mjs` exportés et testés (`drop-column`, `drop-table`, `rename-column`, `alter-not-null-no-default`, `drop-unique-index`, `drop-index`).

**Dépendances entre phases :**
- Phase 1 indépendante — PR A peut se merger seule.
- Phase 2 indépendante — peut être dans PR A.
- Phase 3+4+5 dépendent uniquement de la pré-flight Phase 0.
- Phase 6 indépendante de Phase 3-5.
- Phase 7 suppose Phase 3-6 en place (doc) mais la Task 7.4 (validation e2e) suppose tous les workflows mergés.

**Découpage PR recommandé :**
- PR A : Phases 0+1+2 (préflight + migration safety + commitlint)
- PR B : Phases 3+4+5 (Versions pipeline + wrappers locaux + release-please)
- PR C : Phases 6+7 (WhatsApp CD + doc CLAUDE.md)
- Post-merge : Task 7.4 (validation e2e)
