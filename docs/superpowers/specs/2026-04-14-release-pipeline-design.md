# Release Pipeline — Design

**Date** : 2026-04-14
**Statut** : Approuvé (brainstorming)
**Auteur** : Claude + @kkzakaria

## Contexte et motivation

Le pipeline actuel (`deploy.yml` + `ci.yml`) présente 5 lacunes :

1. Pas d'environnement de staging / preview — aucun test en ligne avant prod
2. Pas de rollback outillé — corrections uniquement par `git revert` + re-deploy
3. Migrations D1 non-transactionnelles avec le déploiement — appliquées avant le build, un échec après migration laisse la DB dans un état non couvert par le code déployé
4. Pas de versioning / tags / release notes — impossible d'identifier la version en prod ni de pinner une révision
5. Worker WhatsApp (`workers/whatsapp/`) déployé manuellement — hors CD, risque de drift

Objectif : refonte complète du pipeline pour adresser les 5 points, tout en restant adapté à une équipe solo et extensible quand l'équipe grandira.

## Décisions structurantes

| Dimension | Choix | Raison |
|---|---|---|
| Topologie | **C** : Cloudflare Versions / Gradual Deployments, pas de staging permanent | Solo : staging permanent = cérémonie sans bénéfice ; Versions donne rollback + canary sans infra doublée ; extensible vers staging en 1-2 jours plus tard |
| Canary | **A** : 10% manuel → 100% manuel | Contrôle timing ; force vigilance ; évolution possible vers auto |
| Migrations | **C** : forward-only + expand/contract + script de lint | Compatible avec canary (ancien + nouveau code coexistent sur même DB) |
| Versioning | **C** : `release-please` + Conventional Commits | Découple *deploy* (par merge) de *release* (par Release PR), CHANGELOG auto |
| Worker WhatsApp | **C** : workflow séparé, path-filtered | Isolation des pannes, logs distincts |
| Rollback trigger | **A2** : CLI + workflow GitHub | Audit trail + fallback depuis mobile |
| Promote trigger | **B1** : workflow GitHub | Cohérent avec rollback |
| Conventional Commits | **C1** : commitlint + Husky `commit-msg` hook | `release-please` a besoin de commits conformes |
| Notifications | **D1** : aucune (email GitHub natif sur échec) | Minimal pour démarrer |
| Hero KV preload | **E1** : ne tourne qu'à la promotion 100% | Évite de préloader un hero invisible pour 90% du trafic |

## Vue d'ensemble du pipeline

Principe : **deploy ≠ promote ≠ release**.

- **Deploy** : chaque merge sur `main` → nouvelle version Cloudflare déployée à 10% du trafic
- **Promote** : action manuelle → version 10% passe à 100%
- **Release** : mergie d'une Release PR maintenue par `release-please` → tag SemVer + GitHub Release + entrée CHANGELOG.md

6 workflows GitHub Actions :

| Workflow | Déclencheur | Rôle |
|---|---|---|
| `ci.yml` | PR vers `main` + push `main` | tsc + eslint + vitest + migration-safety lint |
| `deploy.yml` | push `main` | migrate D1 prod → build → upload version → deploy à 10% |
| `promote.yml` | `workflow_dispatch` | promote dernière version à 100% + seed hero KV |
| `rollback.yml` | `workflow_dispatch` (avec `version_id`) | bascule 100% trafic sur version antérieure |
| `deploy-whatsapp.yml` | push `main` filtré `workers/whatsapp/**` + `workflow_dispatch` | déploie Worker WhatsApp (pas de canary) |
| `release-please.yml` | push `main` | maintient une Release PR (bump + CHANGELOG) |

## Workflows — détail

### `ci.yml` (modifié)

Steps :

1. `npm ci`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm test`
5. **Nouveau** : `bash scripts/check-migration-safety.sh`

### `deploy.yml` (refonte)

Déclencheur : push `main`. `concurrency: deploy` avec `cancel-in-progress`.

Job `ci` : identique à `ci.yml` (gate).

Job `deploy` :

1. `npm ci`
2. `bash scripts/migrate.sh --remote` — migrations D1 prod (doivent être backward-compatible avec l'ancien code à 90%)
3. `npm run build:worker`
4. `wrangler versions upload --tag "sha-<short>" --message "<commit-msg>"` — capture `version-id` dans `$GITHUB_OUTPUT`
5. Si `wrangler versions list` retourne ≥ 2 entrées : `wrangler versions deploy <new>@10% <previous>@90% --yes`.
   Sinon (bootstrap) : `wrangler versions deploy <new>@100% --yes` et skip les étapes suivantes (pas de promotion nécessaire).
6. Crée (ou met à jour) une issue GitHub "Pending promotion" avec le `version_id` et un lien vers `promote.yml`.
7. **Pas** de seed hero KV ici.

### `promote.yml` (nouveau)

Déclencheur : `workflow_dispatch`. Input optionnel `version_id` (défaut : version la plus récemment uploadée qui n'est pas encore à 100% du trafic — résolue via `wrangler versions list --json` + filtre).

Steps :

1. `npm ci`
2. `wrangler versions deploy <version_id>@100% --yes`
3. `node scripts/seed-hero-preload.js`
4. Commente et ferme l'issue "Pending promotion" correspondante.

### `rollback.yml` (nouveau)

Déclencheur : `workflow_dispatch`. Inputs requis : `version_id`, `reason`.

Steps :

1. `npm ci`
2. `wrangler rollback --version-id <version_id> --message "Rollback by <actor>: <reason>"`
3. Crée une issue "Post-rollback investigation" avec contexte (version cassée, version restaurée, raison, actor).

Note : **pas** de re-migration DB. Par définition, la version cible était compatible avec un schéma plus ancien (expand/contract).

### `deploy-whatsapp.yml` (nouveau)

Déclencheur : push `main` avec `paths: ['workers/whatsapp/**', '.github/workflows/deploy-whatsapp.yml']` + `workflow_dispatch`.

Steps :

1. `npm ci`
2. `npx wrangler deploy --config workers/whatsapp/wrangler.jsonc` (pas de canary — webhook Meta)
3. Smoke check HEAD au endpoint webhook (attend 200)

### `release-please.yml` (nouveau)

Déclencheur : push `main`.

Steps :

1. `googleapis/release-please-action@v4`
   - `release-type: node`
   - manifest : `.release-please-manifest.json`
   - config : `release-please-config.json`
2. Maintient une Release PR ouverte ("chore: release main") qui bump `package.json` + met à jour `CHANGELOG.md` à partir des Conventional Commits accumulés
3. Au merge de la Release PR : tag `vX.Y.Z` + GitHub Release + entrée CHANGELOG.md

## Outils locaux

### `package.json` — scripts ajoutés

```json
{
  "scripts": {
    "rollback": "bash scripts/rollback.sh",
    "promote": "bash scripts/promote.sh",
    "versions:list": "wrangler versions list",
    "check:migrations": "bash scripts/check-migration-safety.sh",
    "commitlint": "commitlint --edit"
  }
}
```

### `scripts/rollback.sh`

Wrapper interactif sur `wrangler rollback` :

- Liste les 10 dernières versions (tag + message)
- Prompt pour choisir un `version_id`
- Confirmation
- Exécute `wrangler rollback --version-id <id>`

Utilité : rollback en <30s depuis une machine quelconque avec wrangler installé (urgence mobile, GitHub Actions indisponible).

### `scripts/promote.sh`

Wrapper interactif sur `wrangler versions deploy <id>@100%` :

- Affiche les versions actives (avec split 10/90 visible)
- Demande confirmation du `version_id` à promouvoir
- Exécute

### `scripts/check-migration-safety.sh`

Lint des fichiers `drizzle/*.sql` **nouvellement ajoutés**. Base de comparaison :

- En CI sur une PR : `git diff --name-only --diff-filter=A origin/${{ github.base_ref }}...HEAD`
- En pre-commit local : `git diff --name-only --diff-filter=A --cached` (fichiers stagés)
- En CI sur push `main` : `git diff --name-only --diff-filter=A HEAD~1 HEAD`
- Fallback si aucune base détectée : lint tous les fichiers `drizzle/*.sql` (verbeux mais safe)

Patterns bloqués :

| Pattern (regex, case-insensitive) | Niveau | Raison |
|---|---|---|
| `\bDROP COLUMN\b` | error | Casse l'ancien code pendant le canary 10/90 |
| `\bDROP TABLE\b` | error | Idem |
| `\bRENAME COLUMN\b` | error | Idem |
| `\bALTER COLUMN\b.*\bNOT NULL\b` sans `\bDEFAULT\b` dans la même instruction | error | Échoue sur lignes existantes |
| `\bDROP\s+INDEX\b[^;]*unique` (case-insensitive, substring match) | error | Lève une contrainte critique. Heuristique basée sur la convention Drizzle qui nomme les unique indexes avec suffixe `_unique` (ex: `categories_slug_unique`) — détecté par match de substring `unique` (sans `\b` final car `_unique` n'a pas de word boundary en regex POSIX) |
| `\bDROP\s+INDEX\b` (autre cas) | warning | Autorisé mais signalé. Peut impacter les performances ; vérifier manuellement qu'il n'y a pas de contrainte à préserver |

**Limitation connue** : SQLite ne permet pas d'exprimer "UNIQUE" dans la syntaxe `DROP INDEX` (contrairement à certains dialectes). La détection repose donc sur le **nom de l'index** plutôt que sur un mot-clé SQL. Si un projet future n'utilise pas la convention de nommage Drizzle, adapter le pattern ou s'en remettre au bypass marker + relecture manuelle.

Bypass : toute ligne contenant `-- migration-safety: acknowledged reason="<text>"` dans le fichier SQL désactive le lint pour ce fichier **et logue l'acknowledgement** (contexte pour `git blame` futur).

Sortie :

- Code 0 si OK ou warnings seuls
- Code 1 sinon, avec liste des violations et suggestion (ex : "DROP COLUMN détecté ligne 12. Pattern recommandé : 2 PRs — PR1 retire les usages du code, PR2 drop la colonne. Ou ajoutez `-- migration-safety: acknowledged reason=\"...\"` si intentionnel.")

Lancé depuis :

- pre-commit hook Husky
- CI (step dans `ci.yml`)
- Manuellement via `npm run check:migrations`

### `.husky/commit-msg` (nouveau)

```bash
npx --no -- commitlint --edit $1
```

### `commitlint.config.js` (nouveau)

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [
      'storefront', 'admin', 'whatsapp', 'auth', 'db',
      'seo', 'claude', 'ci', 'deps', 'release',
    ]],
  },
};
```

### `.husky/pre-commit` (modifié)

Ajoute le check migrations à la chaîne existante :

```bash
npx tsc --noEmit
npm run lint
npx vitest run
bash scripts/check-migration-safety.sh
```

### `release-please-config.json` (nouveau)

```json
{
  "release-type": "node",
  "packages": {
    ".": { "release-type": "node", "package-name": "netereka" }
  },
  "changelog-sections": [
    { "type": "feat",     "section": "Features" },
    { "type": "fix",      "section": "Bug Fixes" },
    { "type": "perf",     "section": "Performance" },
    { "type": "refactor", "section": "Refactoring" },
    { "type": "docs",     "section": "Documentation", "hidden": false },
    { "type": "chore",    "hidden": true },
    { "type": "ci",       "hidden": true }
  ]
}
```

### `.release-please-manifest.json` (nouveau)

```json
{ ".": "1.0.0" }
```

(Correspond à `package.json.version` actuel.)

## Runbooks

### A. Ship une feature (cas nominal)

1. `git checkout -b feat/<feature>`
2. Coder, tester en local (`npm run dev` / `npm run preview`)
3. `git commit` → Husky lance `tsc + lint + vitest + check:migrations`, puis `commit-msg` lance commitlint
4. `git push`, ouvrir PR vers `main`
5. CI passe (mêmes checks)
6. Merge PR (squash)
   - `deploy.yml` : migrate D1 → build → upload version → deploy à 10%
   - `release-please.yml` : met à jour la Release PR ouverte
7. Notification GitHub : "Pending promotion — version `<id>`"
8. Surveiller 5-15 min (logs Cloudflare, comportement en conditions réelles)
9. Si OK : Actions → `promote.yml` → Run workflow → 100% + seed hero KV
10. Si KO : Actions → `rollback.yml` → choisir version précédente → 100% sur l'ancienne (instantané)

### B. Rollback urgent (depuis mobile ou GitHub down)

1. `git pull` sur une machine avec wrangler
2. `npm run rollback`
3. Choisir `version_id`, confirmer
4. Documenter dans une issue GitHub a posteriori

### C. Publier une release officielle (hebdo ou quand il y a matière)

1. Ouvrir la Release PR maintenue par `release-please` (titre "chore: release main")
2. Vérifier le CHANGELOG.md généré et le version bump
3. Merger la Release PR
   - `release-please` crée tag `vX.Y.Z` + GitHub Release + entrée CHANGELOG.md
   - `deploy.yml` redéploie (cycle 10% → promote normal)

La GitHub Release référence le commit SHA ; on retrouve la version Cloudflare correspondante via `wrangler versions list` filtré par `tag:sha-<short-sha>`.

### D. Migration nécessitant un drop / rename (expand/contract)

Décomposer en 2 ou 3 PRs :

**PR 1 (« expand »)** :

- Ajouter nouvelle colonne / table / index
- Modifier le code pour dual-write (ancien + nouveau)
- Ne **pas** dropper l'ancien
- Lint passe, canary OK (ancien et nouveau code coexistent)

**PR 2 (« migrate data », optionnel)** :

- Backfill des données si nécessaire
- Modifier le code pour ne lire que le nouveau
- Lint passe, canary OK

**PR 3 (« contract »)** :

- `DROP COLUMN` / `DROP TABLE` de l'ancien
- Le code n'utilise plus l'ancien depuis la PR 2
- Lint bloque par défaut → ajouter dans le fichier SQL :
  ```sql
  -- migration-safety: acknowledged reason="dropped after PR #<N> stopped using"
  ```
- Lint passe

### E. Bootstrap (premier déploiement avec ce pipeline)

Le premier merge sur `main` après installation du pipeline :

- `wrangler versions list` retourne < 2 entrées
- `deploy.yml` déploie à 100% direct (pas de canary, pas de "previous version")
- À partir du 2ᵉ merge : flow canary 10/90 normal

Condition implémentée par une simple check bash dans le workflow.

## Path d'évolution vers staging permanent (Phase 2)

Quand l'équipe atteint 2+ devs ou quand le risque de prod directe devient inacceptable.

### Changements infrastructure

- Nouveau Worker `netereka-staging` (domain `staging.netereka.xxx`)
- Nouvelle D1 `netereka-staging-db`
- Nouveau KV `netereka-staging-kv`
- Nouveau R2 bucket ou préfixe `staging/` dans le bucket prod
- `wrangler.jsonc` restructuré avec sections `[env.staging]` + `[env.production]`
- Idem `workers/whatsapp/wrangler.jsonc`

### Changements branches

- Nouvelle branche `develop` (default)
- `main` devient prod-only, protégée
- Flow : feature → PR vers `develop` → merge → deploy staging → release PR `develop → main` → merge → deploy prod (canary)

### Changements workflows

- `deploy.yml` (existant) : déclenché sur push `main` (prod, canary) — inchangé fonctionnellement
- `deploy-staging.yml` (nouveau) : push `develop` → deploy à 100% direct sur staging
- `release-please.yml` : ajusté pour ouvrir une Release PR `develop → main`
- `promote.yml` / `rollback.yml` : inchangés (prod uniquement)

### Sync données staging

- Script `scripts/sync-staging-from-prod.sh` (équivalent du `sync-local-db.sh` actuel, target = staging)
- Cadence : hebdo ou à la demande

### Ce qui reste identique

- Discipline migration safety + script de lint
- `release-please` + Conventional Commits
- Cloudflare Versions sur prod (canary, promote, rollback)
- Outils locaux (`npm run rollback`, `promote`, `check:migrations`)
- Worker WhatsApp séparé

### Effort estimé

1-2 jours. Aucun refactor structurel nécessaire.

## Fichiers créés / modifiés

### Créés

```
.github/workflows/promote.yml
.github/workflows/rollback.yml
.github/workflows/deploy-whatsapp.yml
.github/workflows/release-please.yml

scripts/rollback.sh
scripts/promote.sh
scripts/check-migration-safety.sh

.husky/commit-msg
commitlint.config.js
release-please-config.json
.release-please-manifest.json
CHANGELOG.md                     (créé par release-please au 1er run)
```

### Modifiés

```
.github/workflows/ci.yml         (+ step migration-safety)
.github/workflows/deploy.yml     (refonte : versions upload + deploy @10%)
.husky/pre-commit                (+ migration-safety check)
package.json                     (+ scripts + devDeps commitlint)
CLAUDE.md                        (+ section "Release pipeline" avec runbooks condensés)
```

## Prérequis / actions hors-code

- **Token Cloudflare** : vérifier que `CLOUDFLARE_API_TOKEN` a les permissions pour `wrangler versions upload|deploy|rollback` (en plus des permissions existantes `Workers Scripts:Edit` et `D1:Edit`)
- **Discipline commits** : après merge de la PR d'installation, tous les commits doivent être Conventional (enforcement local via `commit-msg` hook ; à envisager comme step CI optionnelle plus tard)
- **Branch protection `main`** (recommandé) : exiger CI passant + PR review (auto-review OK en solo)
- **Bootstrap** : premier déploiement à 100% direct (cf. Runbook E)

## Risques identifiés

| Risque | Probabilité | Mitigation |
|---|---|---|
| Parsing fragile du `version_id` depuis stdout `wrangler versions upload` | Moyenne | Utiliser `--json` si dispo ; sinon regex robuste avec fallback et log explicite en cas d'échec |
| `check-migration-safety.sh` faux-positif sur SQL légitime | Moyenne | Bypass marker documenté ; règles faciles à ajuster |
| Migration appliquée puis build/deploy échoue | Faible | Forward-only + expand/contract = vieux code (100% du trafic après échec) tolère le nouveau schéma |
| `release-please` ouvre une Release PR pendant un incident | Faible | Release PR n'auto-merge jamais ; ignorer pendant l'incident |
| Oubli de promote → version coincée à 10% | Moyenne | Issue "Pending promotion" créée à chaque deploy ; évolution possible vers auto-promote après N heures si récurrent |
| Cloudflare Versions : historique limité en rétention | À vérifier | **Action** : traité comme **première étape** du plan d'implémentation (confirmer la durée de rétention via docs Cloudflare + test). Si limitée, compléter avec tags git + procédure de re-deploy documentée comme fallback |
| WhatsApp Worker : pas de canary = casse immédiate visible par Meta | Faible | Smoke check HEAD post-deploy + rollback manuel via `wrangler rollback --config workers/whatsapp/wrangler.jsonc` |

## Hors scope

Volontairement exclus de cette refonte :

- Observabilité / SLO / alerting (reporté)
- Preview per PR (reporté à Phase 2 staging)
- Auto-rollback sur métrique (reporté)
- Deploy blue-green avec 2 Workers (Cloudflare Versions couvre déjà le besoin)
- Tests E2E dans la CI (pas demandé ; existant = vitest unitaires)

## Validation

- Brainstorming validé par @kkzakaria le 2026-04-14
- Prochaine étape : invoquer `writing-plans` pour produire le plan d'implémentation détaillé
