# Release Pipeline

Complete reference for how code reaches production at NETEREKA. Covers the deploy/promote/rollback workflows, the release versioning mechanism, migration safety, and troubleshooting.

**Audience** : anyone merging to `main`, anyone on-call, anyone debugging a bad deployment.

---

## Table of Contents

- [Core Concepts](#core-concepts)
- [Workflows](#workflows)
- [Runbooks](#runbooks)
  - [A. Ship a feature (nominal)](#a-ship-a-feature-nominal)
  - [B. Emergency rollback](#b-emergency-rollback)
  - [C. Cut an official release (SemVer)](#c-cut-an-official-release-semver)
  - [D. Safe destructive migration (expand/contract)](#d-safe-destructive-migration-expandcontract)
  - [E. Deploy only the WhatsApp Worker](#e-deploy-only-the-whatsapp-worker)
- [Migration Safety](#migration-safety)
- [Conventional Commits](#conventional-commits)
- [Local Wrappers](#local-wrappers)
- [Cloudflare Specifics](#cloudflare-specifics)
- [Troubleshooting](#troubleshooting)
- [Evolution Path](#evolution-path)

---

## Core Concepts

The pipeline decouples three distinct actions that are often conflated :

| Concept | Trigger | Result |
|---|---|---|
| **Deploy** | Each merge to `main` | New Cloudflare Worker version uploaded; traffic routed at **10%** (canary) |
| **Promote** | Manual (workflow dispatch or local CLI) | Canary version goes to **100%** traffic |
| **Release** | Merge a "chore: release main" PR maintained by release-please | SemVer tag + GitHub Release + `CHANGELOG.md` entry |

**A deploy is not a release.** Every commit on `main` deploys, but only selected milestones become releases. This separation lets you ship incremental changes safely while reserving versioning ceremony for meaningful cuts.

**A canary is not a staging environment.** The 10% split runs on real traffic, real data. Validation means watching production logs / behavior for 5-15 minutes before promoting, not clicking through a mock environment.

---

## Workflows

Six GitHub Actions workflows implement the pipeline.

### `ci.yml`
- **Trigger** : pull requests + push to `main`
- **Steps** : `tsc --noEmit`, `npm run lint`, `npm test`, `node scripts/check-migration-safety.mjs`
- **Purpose** : gate. Nothing merges if CI fails.

### `deploy.yml`
- **Trigger** : push to `main`
- **Concurrency** : `group: deploy`, `cancel-in-progress: true` (only one deploy runs at a time; newer ones cancel older ones)
- **Flow** :
  1. Run CI job again as a final gate
  2. Run D1 migrations on prod (via `scripts/migrate.sh --remote`)
  3. Build worker (OpenNext + Next.js → `.open-next/worker.js`)
  4. **Capture current** : read `wrangler deployments list --json`, pick the active 100% version (fallback to highest-percentage version if split state). Fail closed on any wrangler error.
  5. **Upload new version** : `wrangler versions upload --tag sha-<short>` — parses the `Worker Version ID: <uuid>` line from output
  6. **Bootstrap mode** (no previous deployment found) : seed hero KV first, then deploy @100% direct
  7. **Canary mode** (previous deployment exists) : deploy new@10% + prev@90%, create a "Pending promotion" GitHub issue with both promote and rollback inputs

### `promote.yml`
- **Trigger** : `workflow_dispatch` (manual)
- **Input** : `version_id` (optional — auto-detects the version currently in the canary split when empty)
- **Flow** :
  1. Resolve `version_id` : use the explicit input, or query `wrangler deployments list` and pick the version with `0 < percentage < 100` (i.e. the **active** canary, not an uploaded-but-never-deployed version)
  2. `wrangler versions deploy <id>@100%`
  3. Re-seed hero LCP preload KV
  4. Close any matching "Pending promotion" issue with a comment

### `rollback.yml`
- **Trigger** : `workflow_dispatch` (manual)
- **Inputs** : `version_id` (required), `reason` (required, appears in audit trail)
- **Security** : all user inputs are routed through **environment variables**, never interpolated directly into shell scripts. Eliminates an entire class of command injection.
- **Flow** :
  1. `wrangler rollback --version-id <id> --message "Rollback by <actor>: <reason>"`
  2. Create a "Post-rollback investigation" issue with checklist (root cause, fix PR, schema consistency check)

### `deploy-whatsapp.yml`
- **Trigger** : push to `main` filtered on `workers/whatsapp/**` or the workflow file itself; also `workflow_dispatch`
- **Concurrency** : separate group from main worker (`deploy-whatsapp`)
- **Flow** :
  1. `wrangler deploy --config workers/whatsapp/wrangler.jsonc` (no canary — Meta webhook has one endpoint, split would break the verify handshake)
  2. Smoke check : HEAD request to `$WHATSAPP_WORKER_URL/webhook`, expect 200 or 405. 3 retries with 5s backoff for edge propagation.

### `release-please.yml`
- **Trigger** : push to `main`
- **Permissions** : `contents: write`, `pull-requests: write` (requires "Allow GitHub Actions to create and approve pull requests" enabled in Settings → Actions → General)
- **Action** : `googleapis/release-please-action@v4` reads accumulated Conventional Commits and maintains an open "chore: release main" PR that bumps `package.json` + updates `CHANGELOG.md`. Merging that PR creates the `vX.Y.Z` tag + GitHub Release.

---

## Runbooks

### A. Ship a feature (nominal)

```
1. git checkout -b feat/<feature-name>
2. Code, test locally (`npm run dev` / `npm run preview`)
3. git commit
   → Husky runs: tsc + lint + vitest + migration-safety
   → commit-msg hook validates Conventional Commit format
4. git push && gh pr create --base main
5. CI runs (same gates as pre-commit)
6. Merge PR (squash)
   → deploy.yml: migrate → build → upload → canary 10/90
   → release-please.yml: updates the open Release PR
7. GitHub issue "Pending promotion — sha-<short>" created with the version_id
8. Observe 5-15 min (Cloudflare logs dashboard, real traffic behavior,
   sentry/error signals). The canary serves 10% of real users.
9. If OK: Actions → "Promote to 100%" → Run workflow
   (leave version_id empty; it auto-detects the canary)
   → 100% traffic + hero KV re-seed + issue closed
10. If bad: Actions → "Rollback" with version_id = previous baseline
    (listed in the pending-promotion issue body, bullet "Rollback to baseline")
    → Instant traffic switch + investigation issue opened
```

### B. Emergency rollback

Two paths depending on availability :

**Path 1 — GitHub Actions (preferred, audited)** :
- Actions → "Rollback" → Run workflow
- `version_id` : from the pending-promotion issue (bullet "Rollback to baseline"), or from `npm run versions:list`
- `reason` : short, required (appears in the investigation issue)

**Path 2 — Local CLI (when GitHub is down or you're on mobile)** :
```bash
git pull  # or any machine with wrangler installed and authenticated
npm run rollback
# → interactive: shows 10 most recent versions, prompts for ID + reason + confirmation
# → executes wrangler rollback
```

After either path, document the incident (if not auto-created by the workflow) — root cause, fix PR if needed, expand/contract discipline sanity check.

### C. Cut an official release (SemVer)

Weekly cadence or whenever there's material to ship officially.

```
1. Open the "chore: release main" Release PR
   (maintained by release-please, refreshed every push)
2. Review the generated CHANGELOG.md and version bump
   - Minor for feat: commits, patch for fix:, major for BREAKING CHANGE
3. Merge the Release PR (squash)
   → release-please creates git tag vX.Y.Z
   → GitHub Release published with changelog body
   → CHANGELOG.md committed on main
   → deploy.yml runs (it's still a push to main) and redeploys the tagged commit
```

The SemVer tag references a git SHA, which corresponds to a Cloudflare Worker version. To trace "which Cloudflare version is v1.5.0 ?" → `wrangler versions list | grep sha-<short-sha-of-tag>`.

### D. Safe destructive migration (expand/contract)

During canary 10/90, old code and new code share the same D1. Any migration must be backward-compatible with the previous code — otherwise the 90% traffic breaks.

Split destructive changes into **2 or 3 PRs** :

**PR 1 — Expand** :
- Add new column / table / index
- Modify code to dual-write (both old and new)
- Do NOT drop the old
- Lint passes, canary safe (both code versions coexist)

**PR 2 — Migrate data** (optional, if backfill needed) :
- Backfill data from old to new
- Modify code to read only from new
- Lint passes, canary safe

**PR 3 — Contract** :
- `DROP COLUMN` / `DROP TABLE` the old
- Code no longer uses old since PR 2
- Lint blocks by default → add in the SQL file :
  ```sql
  -- migration-safety: acknowledged reason="dropped after PR #<N> stopped using"
  ```
- Lint passes with the acknowledgement logged

### E. Deploy only the WhatsApp Worker

**Automatic** : any push to `main` touching `workers/whatsapp/**` triggers `deploy-whatsapp.yml` automatically. No other deploy path runs.

**Manual** (e.g. re-deploy without a code change) :
- Actions → "Deploy WhatsApp Worker" → Run workflow

**Rollback WhatsApp** :
```bash
# No dedicated workflow — use wrangler directly with the config
npx wrangler rollback --config workers/whatsapp/wrangler.jsonc
```

---

## Migration Safety

`scripts/check-migration-safety.mjs` enforces expand/contract discipline on Drizzle SQL migrations. Runs in pre-commit and CI.

### Blocked patterns

| Pattern | Level | Reason |
|---|---|---|
| `DROP COLUMN` | error | Breaks old code during canary |
| `DROP TABLE` | error | Same |
| `RENAME COLUMN` | error | Same |
| `ALTER COLUMN ... NOT NULL` without `DEFAULT` | error | Fails on existing rows |
| `DROP INDEX` on index named `*unique*` (Drizzle convention) | error | Drops a unique constraint |
| `DROP INDEX` (any other) | warning | May impact performance |

### Detection

The script lints only **newly-added** `drizzle/*.sql` files :

- In CI on a PR : `git diff --diff-filter=A origin/<base>...HEAD`
- In pre-commit : staged files (`git diff --cached --diff-filter=A`)
- On push : `git diff --diff-filter=A HEAD~1 HEAD`

If no strategy applies, the script **skips** rather than lints history. Historical migrations (like `0009_fast_karnak.sql` using Drizzle's SQLite column-rename emulation pattern) predate the current rules and are out of scope.

### Comment stripping

Patterns match against **stripped SQL** — line comments (`--`) and block comments (`/* */`) are removed before matching. A narrative comment like `-- TODO: next PR will DROP TABLE foo` won't trigger a false positive. The bypass marker check runs against the raw content, so it still works.

### Bypass

For intentional unsafe migrations, add anywhere in the SQL file :

```sql
-- migration-safety: acknowledged reason="<free-form explanation>"
```

The script logs the acknowledgement and skips the file entirely. `git blame` preserves the context forever.

---

## Conventional Commits

Required format enforced by commitlint (Husky `commit-msg` hook) :

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types** : `feat`, `fix`, `perf`, `refactor`, `docs`, `chore`, `ci`, `test`, `style`

**Scopes** (enum, see `commitlint.config.js`) :
- `storefront`, `admin`, `whatsapp`, `auth`, `db`, `seo`, `claude`, `ci`, `deps`, `release`

**Breaking change** : add `!` after type, or include `BREAKING CHANGE:` in body.

### Examples

✅ `feat(storefront): add product quick-view modal`
✅ `fix(whatsapp): decouple buttons from is_active flag`
✅ `feat(auth)!: require email verification before first order`
✅ `chore(deps): bump next to 16.2.3`

❌ `update stuff` — no type
❌ `feat: add thing` — no scope
❌ `feat(random): thing` — scope not in enum

Release-please groups commits into CHANGELOG sections based on type : `feat` → Features, `fix` → Bug Fixes, `perf` → Performance, `refactor` → Refactoring, `docs` → Documentation. `chore / ci / test / style` are hidden from the CHANGELOG.

---

## Local Wrappers

Four npm scripts for pipeline operations from a developer machine :

| Command | Description |
|---|---|
| `npm run versions:list` | `wrangler versions list` — all uploaded versions |
| `npm run check:migrations` | Run migration-safety lint locally |
| `npm run promote` | Interactive : shows current traffic split + recent versions, prompts for ID + confirmation, promotes to 100% + re-seeds hero KV |
| `npm run rollback` | Interactive : lists 10 recent versions, prompts for ID + reason + confirmation, runs `wrangler rollback` |

**When to use local over workflows** :

- `versions:list` and `check:migrations` : always local, they're informational
- `promote` : prefer the GitHub workflow (audit trail, auto-closes the issue). Local is a fallback.
- `rollback` : prefer the GitHub workflow when possible. Local is the go-to for urgent situations (on mobile, GitHub down, 2am).

---

## Cloudflare Specifics

### Versions vs Deployments

Two related concepts that are easy to confuse :

- **Version** : an immutable snapshot of worker code + bindings + config. Created by `wrangler versions upload`. Has a UUID.
- **Deployment** : a traffic routing decision linking one or more versions to percentages. Created by `wrangler versions deploy <id>@<pct>%`.

`wrangler versions list` → all uploaded versions (including ones never routed)
`wrangler deployments list` → history of traffic routing changes (only versions that got traffic)

This is why `promote.yml` queries **deployments** (to find the actual canary), not versions — an uploaded-but-never-deployed version has `deployed_percentage: 0` in versions list, which would match the naive filter `< 100%` and get promoted to 100% by mistake.

### Retention

Cloudflare retains versions for **at least 2 months** on the current plan (verified against actual data — versions from February 2026 still visible in April 2026). `rollback.yml` is a reliable safety net within that window.

### Token Permissions

The `CLOUDFLARE_API_TOKEN` GitHub secret needs :
- `Account : Workers Scripts : Edit` (covers versions upload/deploy/rollback)
- `Account : D1 : Edit` (for migrations)

`wrangler versions upload`, `versions deploy`, and `rollback` are all part of the `Workers Scripts` permission scope — no additional permission required beyond what the existing `wrangler deploy` needs.

---

## Troubleshooting

### `release-please` error: "GitHub Actions is not permitted to create or approve pull requests"

Cause : repo setting not enabled.
Fix : Settings → Actions → General → Workflow permissions → check "Allow GitHub Actions to create and approve pull requests".

### Canary was never promoted, a new deploy arrived — what happens to the unpromoted canary ?

The new deploy captures the current 90% version as baseline and starts a fresh 10/90. The previous 10% canary is displaced (still exists as an uploaded version, just not in the active traffic split). Its changes are effectively abandoned in prod.

**Mitigation** : always promote (or explicitly rollback) before the next merge on main. The "Pending promotion" issue is the reminder.

### Deploy at 10% but hero KV was re-seeded anyway

Shouldn't happen — hero KV seed is only in the bootstrap path (before cutover) and the promote workflow. If you see a KV change in a pure canary step, check `deploy.yml` for drift.

### Promote via Cloudflare dashboard instead of workflow

End state : correct (version goes to 100%). Side effects missed :
- Hero LCP preload KV not re-seeded (may or may not matter for that specific deploy)
- `Pending promotion` issue stays open (close it manually)

**Recommendation** : always use `promote.yml` (or `npm run promote`) so both actions run.

### Pre-commit hook is blocking on an unrelated file

Check which hook failed (tsc / eslint / vitest / migration-safety). The hook runs the full project gates — not just on changed files. If it's a flake, don't `--no-verify` — investigate.

### Migration lint flags an old migration that was already deployed

The script only looks at newly-added files. If you see this, you likely added an old migration back via cherry-pick or merge. Check `git diff --diff-filter=A` against the right base.

### Deploy workflow fails on `wrangler deployments list`

The pipeline fails closed on this (by design — silent failure here could bootstrap over an existing prod). Causes :
- Token permissions regressed (check Workers Scripts : Edit)
- Network blip : re-run the workflow
- API outage : check https://www.cloudflarestatus.com/

---

## Evolution Path

When the team grows beyond solo, or when the risk of production-direct deploys becomes unacceptable, add a staging environment. **The mechanics built here are unchanged** — only the deployment target differs.

### Phase 2 changes

- New Cloudflare Worker `netereka-staging` (e.g. `staging.netereka.ci`)
- New D1 `netereka-staging-db`
- New KV namespace + R2 (or prefix)
- `wrangler.jsonc` restructured with `[env.staging]` + `[env.production]` sections
- New branch `develop` (default), `main` reserved for production
- Flow : feature → PR to `develop` → merge → deploy to staging (100%, no canary on staging) → Release PR `develop → main` → merge → deploy to prod (canary flow as today)
- New workflow `deploy-staging.yml` (push `develop` → staging 100%)
- Existing `deploy.yml` / `promote.yml` / `rollback.yml` : unchanged, still on prod
- Sync data staging ← prod : `scripts/sync-staging-from-prod.sh` (adapt the existing `sync-local-db.sh`)

### What stays identical

- Migration safety lint + expand/contract discipline
- release-please + Conventional Commits
- Cloudflare Versions canary 10/90 on prod
- Local wrappers
- WhatsApp Worker separation

Estimated effort : 1-2 days. No refactor of the current design.
