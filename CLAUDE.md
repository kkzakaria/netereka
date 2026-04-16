# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NETEREKA Electronic is an e-commerce platform for electronics targeting the Ivory Coast market. Currency is XOF (Franc CFA), payment is cash-on-delivery only (COD), and delivery uses an in-house fleet.

## Tech Stack

- **Framework:** Next.js 16.1 (App Router) with TypeScript 5
- **Deployment:** Cloudflare Workers via `@opennextjs/cloudflare` (OpenNext)
- **Styling:** Tailwind CSS 4 with CSS variables (oklch color space) in `app/globals.css`
- **UI Components:** shadcn/ui (Radix-based), using `class-variance-authority` for variants
- **Icons:** HugeIcons (`@hugeicons/react`, `@hugeicons/core-free-icons`)
- **State Management:** Zustand with persist middleware (`stores/cart-store.ts`)
- **Forms:** React Hook Form + Zod
- **Auth:** better-auth with Cloudflare Turnstile captcha, OAuth (Google, Facebook, Apple)
- **ORM:** Drizzle ORM with `drizzle-kit` for schema management
- **URL State:** nuqs (type-safe URL search params)
- **Notifications:** Resend (transactional email)
- **Toasts:** Sonner
- **Theming:** next-themes (light/dark)
- **Backend Services:** Cloudflare D1 (SQLite), KV, R2 (images)

## Commands

```bash
npm run dev             # Start dev server (localhost:3000, Turbopack)
npm run build           # Production build
npm run build:worker    # Build for Cloudflare Workers
npm run preview         # Preview with wrangler
npm run deploy          # Build and deploy to Cloudflare
npm run lint            # ESLint

# Testing (Vitest 4)
npm run test               # Run all tests once (vitest run)
npm run test:watch         # Watch mode

# Database (Drizzle ORM + local D1)
npm run db:generate        # Generate SQL migrations from schema changes
npm run db:studio          # Open Drizzle Studio (visual DB browser)
npm run db:migrate         # Run pending migrations locally (via scripts/migrate.sh)
npm run db:migrate:remote  # Run all pending migrations on remote D1
npm run db:seed            # Seed initial data
npm run db:seed-catalogue  # Seed product catalogue
npm run db:sync            # Sync local DB from production (recommended for realistic data)
```

## Architecture

### Route Groups

- `app/(storefront)/` — Public store: home, products (`/p/[slug]`), categories (`/c/[slug]`), cart, checkout, account, search, contact, static pages (`/a-propos`, `/faq`, `/livraison`, `/conditions-generales`)
- `app/(admin)/` — Protected admin: dashboard, products CRUD, categories, orders, customers, users, audit-log
- `app/(admin-auth)/` — Admin login page (separate layout, no admin sidebar)
- `app/(auth)/` — Customer auth: sign-in, sign-up, forgot-password, reset-password (no header/footer); layout calls `requireGuest()` — guest-only
- `app/(no-guard)/auth/` — Auth pages accessible to authenticated users (e.g. verify-email); no `requireGuest()` guard; must set `robots: noindex` + `force-dynamic`
- `app/api/auth/[...all]/` — better-auth API routes

### Key Directories

- `actions/` — Server Actions organized by domain (`checkout.ts`, `reviews.ts`, `search.ts`, `wishlist.ts`, `addresses.ts`, `account.ts`, `admin/*.ts`)
- `lib/db/` — D1 query helpers with `query<T>()`, `queryFirst<T>()`, `execute()`, `batch()`
- `lib/db/categories.ts` — Category tree queries: `getCategoryTree()`, `getCategoryAncestors()`, `getCategoryDescendantIds()`, `minifyCategoryTree()`
- `lib/db/drizzle.ts` — Drizzle ORM client via `getDrizzle()` (for new code)
- `lib/db/schema.ts` — Drizzle schema definitions for all tables
- `lib/db/types.ts` — TypeScript interfaces for all DB entities (Product, Order, Category, etc.). Also exports `SidebarCategoryNode`, `ProductCardData`, `CategoryNode` — use minimal projection types at RSC→client boundary
- `lib/auth/guards.ts` — Auth guards: `requireAuth()`, `requireAdmin()`, `requireGuest()`, `getOptionalSession()`
- `lib/cloudflare/context.ts` — `getDB()`, `getKV()`, `getR2()` helpers via `getCloudflareContext()`
- `lib/validations/` — Zod schemas for forms (checkout, account, address, review)
- `lib/notifications/` — Email notifications via Resend with HTML templates
- `lib/storage/images.ts` — R2 image upload/delete helpers
- `lib/csv/` — CSV export utilities (orders)
- `lib/constants/` — Domain constants (audit actions, order statuses, customer statuses)
- `lib/types/` — Shared types (`actions.ts` for ActionResult, `cart.ts` for cart types)
- `stores/` — Zustand stores (cart persisted to localStorage)
- `components/ui/` — shadcn/ui base components
- `components/storefront/` — Store components (header, product-card, checkout-form)
- `components/admin/` — Admin components (sidebar, data-tables, order management)
- `components/seo/` — JSON-LD structured data, breadcrumb schema
- `components/providers.tsx` — App-level providers (theme, auth, etc.)

### Server Actions Pattern

Server Actions use `"use server"` directive and follow this pattern:
```typescript
export async function myAction(input: Input): Promise<ActionResult> {
  const session = await requireAuth(); // or requireAdmin()
  const parsed = mySchema.safeParse(input);
  if (!parsed.success) return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  // ... business logic
  return { success: true };
}
```

`ActionResult` interface: `{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }`

### Cloudflare Bindings

Access via `getCloudflareContext()` from `@opennextjs/cloudflare`:
- `env.DB` — D1 database
- `env.KV` — KV namespace
- `env.R2` — R2 bucket for images

Environment types defined in `env.d.ts` as `CloudflareEnv` interface.

### Component Patterns

- `data-slot` attributes for styling/selection (e.g., `data-slot="button"`)
- CVA button variants with sizes: `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`
- Composite components (Card → CardHeader, CardTitle, CardContent)
- `"use client"` only when needed (interactivity, hooks)

### Design System

- **Primary colors:** Navy Blue (#183C78) + Mint Green (#00FF9C)
- **Accessibility:** Min 44px touch targets, mobile-first
- CSS variables use oklch color space with light/dark theme support

### Database

D1 SQLite with Drizzle ORM. Prices stored as integers (XOF, no decimals). Schema defined in `lib/db/schema.ts`, migrations in `drizzle/` (generated by drizzle-kit), seeds in `db/seeds/`. Legacy hand-written migrations archived in `db/migrations-legacy/` (historical reference only).

**Category hierarchy:** 2-level max depth (`MAX_CATEGORY_DEPTH = 2` in `lib/db/types.ts`). Categories use recursive CTEs for tree queries. URLs are flat (`/c/slug`) with breadcrumbs for hierarchy.

Two DB access patterns coexist (gradual migration in progress):
- **Raw SQL** (legacy): `query<T>()`, `queryFirst<T>()`, `execute()`, `batch()` in `lib/db/index.ts`
- **Drizzle ORM** (new code): `getDrizzle()` from `lib/db/drizzle.ts`

**Schema changes workflow:** edit `lib/db/schema.ts` → `npm run db:generate` → review generated SQL in `drizzle/` → `npm run db:migrate` locally → commit (`schema.ts` + `drizzle/*.sql` + `drizzle/meta/`). Remote migrations run automatically on deploy via GitHub Actions.

**Migration tracking:** `scripts/migrate.sh` reads `drizzle/*.sql` and tracks applied migrations in `_drizzle_migrations` table. On first run against an existing DB, it bootstraps by marking the baseline migration as applied, then runs any remaining incremental migrations.

### Environment Variables

Required env vars defined in `env.d.ts` (`CloudflareEnv` interface):
- `BETTER_AUTH_SECRET` — Auth session secret
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` — Facebook OAuth
- `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` — Apple OAuth
- `SITE_URL` — Public site URL
- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile captcha
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (optional) — Transactional email via Resend

Wrangler config: `wrangler.jsonc` (not `.toml`).

## Gotchas

- **Pre-commit hook (Husky):** Runs `tsc --noEmit` + `eslint` + `vitest run` before every commit. Fix all type, lint, and test errors before committing — the hook blocks commits on failure.
- **better-auth creates a session on sign-up** (before OTP email verification) — verify-email must live in `(no-guard)`, not `(auth)`, or authenticated users get 307-redirected to `/`.
- **`sendVerificationOTP` must throw on email failure** — returning normally tells better-auth the OTP was sent; user reaches the OTP page but never receives a code.
- **Bash and route groups:** Paths with parentheses like `app/(admin)/...` must be quoted in bash commands (e.g., `git add "app/(admin)/file.tsx"`), otherwise the shell interprets them as subshells.
- **Local D1 bootstrap:** Before `npm run db:studio` works, you must initialize the local D1 SQLite file first: `npx wrangler d1 execute netereka-db --local --command "SELECT 1"`. Then run `npm run db:migrate` and the seed scripts.
- **Local DB data vs prod:** The seed catalogue (`db/seeds/catalogue.sql`) uses hardcoded image paths that don't exist on R2. For realistic local data (real product images), use `npm run db:sync` instead — it dumps the remote DB, reorders SQL for SQLite compatibility, then re-applies `seed.sql` (test accounts and all sample data) on top via INSERT OR IGNORE (prod rows take precedence). `db:sync` requires Cloudflare credentials (`npx wrangler login` or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`).
- **SEO files:** `app/robots.ts` and `app/sitemap.ts` generate SEO metadata dynamically.
- **Drizzle remote mode:** To use `drizzle-kit` against remote D1, set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, and `CLOUDFLARE_D1_TOKEN` env vars.
- **`.claude/settings.local.json` drift:** This file is modified by tool-permission prompts and will block `gh pr merge` with "local changes would be overwritten". Stash before merging: `git stash push -- .claude/settings.local.json`.
- **Untracked AI tool folders:** The repo root has many untracked `.agent/`, `.kilocode/`, `.crush/`, etc. folders (AI tool configs). Don't use `git add -A` for feature PRs — it bundles them all. Use targeted `git add <specific paths>` instead.
- **Nullable column type sync:** When making a Drizzle column nullable, grep for every `.first<{ ... }>` and `.all<{ ... }>` type parameter referencing that column and update to `string | null`. TypeScript won't catch these type lies and nulls will silently reach runtime (e.g. `fetch('.../v21.0/null/messages')`).
- **Commitlint scope enum:** the `commit-msg` hook rejects unknown scopes. Allowed: `storefront | admin | whatsapp | auth | db | seo | claude | ci | deps | release`. For CI/CD tooling commits use `ci` (not `scripts`, `tooling`, etc. — they're not in the enum).
- **WhatsApp Worker deploy needs `OPEN_NEXT_DEPLOY=1`:** Wrangler auto-detects OpenNext projects (presence of `next.config.*` + `open-next.config.*` + `@opennextjs/cloudflare`) and intercepts `wrangler deploy` to delegate to `opennextjs-cloudflare deploy`, which fails on the WhatsApp worker (plain `src/index.ts`, no OpenNext compiled output). Both `npm run whatsapp:deploy` and `.github/workflows/deploy-whatsapp.yml` set `OPEN_NEXT_DEPLOY=1` to short-circuit the delegation. Don't remove it.
- **`wrangler deployments list --json` returns ascending order** (oldest first). Always `sort_by(.created_on) | reverse | .[0]` to pick the current deployment. Naive `.[0]` burned us once — 90% of prod traffic routed to a 2-day-old version.
- **GitHub setting for release-please:** "Allow GitHub Actions to create and approve pull requests" must be enabled in Settings → Actions → General → Workflow permissions. The UI checkbox needs an explicit **Save** click (it won't auto-persist). Verify via `gh api /repos/<owner>/<repo>/actions/permissions/workflow` — `can_approve_pull_request_reviews` must be `true`.

## Authentication (better-auth)

Server config in `lib/auth/index.ts`, client in `lib/auth/client.ts`, guards in `lib/auth/guards.ts`.

- **DB adapter:** Kysely + D1Dialect (not Drizzle — better-auth uses Kysely internally)
- **Auth methods:** Email/password + social (Google, Facebook, Apple)
- **Captcha:** Cloudflare Turnstile plugin on all auth endpoints
- **Custom user fields:** `phone` (required, user input) and `role` (default `"customer"`, server-only)
- **Roles:** `"customer"`, `"admin"`, `"super_admin"` — checked in `requireAdmin()`
- **Session:** 7-day expiry, 5-minute cookie cache
- **Rate limiting:** 30 req/min general, 5/min for sign-in/sign-up, 3/min for forgot-password

**Middleware scope:** Only enforces `PROTECTED_PATHS` (unauthenticated → redirect to sign-in). Does NOT redirect authenticated users away from auth pages — that is solely the responsibility of `requireGuest()` in the `(auth)` layout.

**Auth guards** (use in Server Components and Server Actions):
- `requireAuth()` — Redirects to `/auth/sign-in` if not authenticated
- `requireAdmin()` — Requires `admin` or `super_admin` role, redirects to `/`
- `requireGuest()` — Redirects to `/` if already authenticated
- `getOptionalSession()` — Returns session or `null`, no redirect

**Client-side:** Import `authClient` from `@/lib/auth/client` (uses `inferAdditionalFields` for typed custom fields).

## WhatsApp Integration

Two-tier config in `whatsapp_config` table:
- **`display_phone_number`** (public): drives storefront `wa.me` buttons. Independent of `is_active` — buttons appear whenever this is set.
- **`phone_number_id`, `access_token`, `verify_token`, `webhook_secret`, `business_account_id`** (API): required only when `is_active=1` to enable the conversational bot.

The Worker (`workers/whatsapp/`) is a separate Cloudflare Worker — CD is wired via `.github/workflows/deploy-whatsapp.yml` (path-filtered on `workers/whatsapp/**`). For manual re-deploys without a code change, use Actions → "Deploy WhatsApp Worker" → Run workflow. Locally : `npm run whatsapp:deploy`. It must respond to Meta webhooks in <5s, so message processing uses `ctx.waitUntil()`.

Public number flow: `getPublicWhatsAppNumber()` (server, React-cached) → `WhatsAppNumberProvider` in `app/(storefront)/layout.tsx` → `useWhatsAppNumber()` hook in client buttons.

Masked secret pattern: admin config form shows secrets as `••••••••` + last 4 chars. Detect "unchanged" on save by exact equality against the expected mask (not `startsWith("••")`), otherwise a real secret starting with bullets gets silently discarded.

## Release Pipeline

Full reference : **[`docs/RELEASE_PIPELINE.md`](./docs/RELEASE_PIPELINE.md)**.

Quick mental model :

- **Deploy** (each merge on `main`) ≠ **Promote** (manual, canary 10% → 100%) ≠ **Release** (merge a release-please PR → SemVer tag + CHANGELOG).
- Six workflows : `ci.yml`, `deploy.yml` (canary 10/90), `promote.yml`, `rollback.yml`, `deploy-whatsapp.yml`, `release-please.yml`.
- Migrations must be backward-compatible (expand/contract). `scripts/check-migration-safety.mjs` blocks `DROP COLUMN / DROP TABLE / RENAME COLUMN / ALTER NOT NULL without DEFAULT / DROP UNIQUE INDEX` in pre-commit and CI. Bypass marker : `-- migration-safety: acknowledged reason="..."`.
- Conventional Commits required (enforced via commitlint `commit-msg` hook). Scopes : `storefront / admin / whatsapp / auth / db / seo / claude / ci / deps / release`.
- Local tooling : `npm run rollback`, `npm run promote`, `npm run versions:list`, `npm run check:migrations`.

Always prefer the GitHub workflows (`promote.yml` / `rollback.yml`) over `wrangler` CLI or the Cloudflare dashboard : the workflows audit-trail the action, re-seed the hero KV on promote, and auto-close the "Pending promotion" issue.

**Operational lessons (hard-learned)** :

- **Always promote (or rollback) the current canary before merging the next PR to `main`.** A new merge triggers a new canary that displaces the previous one — the old 10% version becomes orphaned (never promoted, never reaches 100%). The "Pending promotion" GitHub issue is the visual reminder; don't ignore it.
- **If curating the v`X.Y.Z` CHANGELOG before merging a Release PR**, edit `CHANGELOG.md` on the `release-please--branches--main--components--netereka` branch and push. **But** the GitHub Release page body is "locked in" when release-please first created the PR — it won't pick up your edit automatically. After merge, sync the Release body manually :
  ```bash
  awk '/^## \[X\.Y\.Z\]/{flag=1} /^## \[/{if(flag&&!/^## \[X\.Y\.Z\]/)flag=0} flag' CHANGELOG.md > /tmp/body.md
  gh release edit vX.Y.Z --notes-file /tmp/body.md
  ```
- **Release-please manifest must align with actual git tags** when wiring it into a project with prior manual releases. If `.release-please-manifest.json` says `1.0.0` but the repo has tag `v1.6.0`, release-please will propose a `v1.1.0` release that collides with the existing tag. Init the manifest to the most recent real version.

## Reference Documents

- `NETEREKA_Architecture_Ecommerce_Cloudflare.md` — Full technical architecture and DB schema
- `NETEREKA_Design_System.md` — Colors, typography, spacing, component specs
- `NETEREKA_Plan_Developpement.md` — 4-week development timeline with task tracking and checklists
- `NETEREKA_Homepage_Concept.jsx` — Homepage component prototype
- `docs/RELEASE_PIPELINE.md` — Deploy / promote / rollback / release runbooks and workflow reference

## MCP Servers

The shadcn MCP server is configured (`.mcp.json`) for component scaffolding via `npx shadcn@latest`.
