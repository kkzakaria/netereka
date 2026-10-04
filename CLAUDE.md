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

**DB access standard: Drizzle ORM.** All new and modified queries MUST use `getDrizzle()` from `lib/db/drizzle.ts`. The schema (`lib/db/schema.ts`) is the source of truth, so Drizzle catches column/type mismatches at compile time (a raw-SQL `SELECT slug, updated_at FROM categories` once shipped a broken sitemap because the column didn't exist — Drizzle would have failed the build).

The raw SQL helpers `query<T>()`, `queryFirst<T>()`, `execute()`, `batch()` (in `lib/db/index.ts`) are **legacy**, kept only until the ~31 remaining files are migrated. Do not write new raw SQL. Migration is tracked gradually, file by file (don't mix Drizzle and raw SQL within one file in a single PR — migrate the whole file or leave it). CodeRabbit flags raw SQL in changed code by design; when the finding is on a legacy file deferred to the migration backlog, acknowledge it rather than silencing the rule.

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
- **Test order is shuffled on every run** (`sequence.shuffle`, `vitest.config.ts`), so **an intermittent red is replayed, never re-run**. Vitest prints the seed; `npx vitest run --sequence.seed=<n>` reproduces that exact order, and CI puts the seed in the job summary. A failure that shows up one run in ten is a *deterministic* order bug, just a rare draw — six of them were hiding behind the fixed order. Corollary: the pre-commit hook shuffles too, so a seed-dependent red can block a commit unrelated to it; replay it, find the dependency, don't retry. **Never add `retry` to the test run** — it would turn this signal into noise.
- **What Vitest resets between tests, and what it does not** (measured on this version): the **call history** of a mock is cleared automatically. **Not** cleared: the implementation set by `mockImplementation`/`mockResolvedValue`/`mockRejectedValue`, and the queue of unconsumed `…Once` values. `vi.clearAllMocks()` changes neither — only `mockReset()` clears both. An unconsumed `…Once` is eaten by the *next* test, before whatever its `beforeEach` just set.
- **better-auth creates a session on sign-up** (before OTP email verification) — verify-email must live in `(no-guard)`, not `(auth)`, or authenticated users get 307-redirected to `/`.
- **`sendVerificationOTP` throwing on email failure does not surface to the client on better-auth 1.6.25.** `lib/auth/index.ts` still throws when Resend fails, but the call is wrapped in `ctx.runInBackgroundOrAwait(...)` by the email-otp plugin (`node_modules/better-auth/dist/plugins/email-otp/index.mjs:26`), and without a configured `advanced.backgroundTasks.handler` that wrapper's `else await promise` branch is inside a `try { ... } catch (e) { logger.error(...) }` (`node_modules/better-auth/dist/context/create-context.mjs:214-224`) — the throw is caught and only logged, never rethrown. Combined with `requireEmailVerification: true`, a Resend outage still returns a success response to the client: the user lands on the verification page believing a code was sent, receives nothing, and their only recovery path is the "Renvoyer le code" button.
- **Rate limiting is active in local dev, keyed on a fixed localhost IP.** `getIp()` in `@better-auth/core` falls back to `127.0.0.1` in development when no `cf-connecting-ip` header is present (there's no Cloudflare edge locally). That means every request from every browser tab/incognito window/curl session on your machine shares one rate-limit bucket — the 6th local sign-in attempt within a minute returns 429, even though it looks like separate "users" to you. Not a bug, just a local papercut. The counter lives in the local D1 `rateLimit` table, so restarting the dev server does **not** clear it — either wait out the 60s window or delete the rows directly: `npx wrangler d1 execute netereka-db --local --command "DELETE FROM rateLimit"`.
- **`npm install <pkg>` needs `--force` for now:** a fresh resolution fails with ERESOLVE (`@hookform/resolvers` peerOptional `ajv-formats@^2` vs the root's `^3`) even on a clean tree; `npm ci` is fine. Do not use `--legacy-peer-deps` instead: it writes a lockfile that `npm ci` rejects (missing peers). After `npm install --force`, check `npm ci --dry-run`.
- **`npm run dev` rewrites `CLAUDE.md`:** Next.js appends a generated "AI agents" block to it on startup. `git checkout CLAUDE.md` before committing (or set `agentRules: false` in `next.config`).
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

## Admin MCP Server

Remote MCP endpoint at `POST /api/mcp` (Streamable HTTP, stateless, **MCP 2026-07-28 only** — `legacy: "reject"`, so clients still on the 2025 protocol get `-32022 Unsupported protocol version`) for AI clients that speak CIMD : claude.ai, Claude Desktop, Claude Code (`https://claude.ai/oauth/…`) et Codex / ChatGPT desktop (`https://chatgpt.com/oauth/codex/…`). **Cursor est exclu** : il s'enregistre par DCR, que le régime CIMD seul n'expose pas — ce n'est pas un oubli de `CIMD_ALLOWED_ORIGINS`, l'y ajouter ne le ferait pas fonctionner. Only `POST` is exported; `GET`/`DELETE` are 405 from Next. Spec: `docs/superpowers/specs/2026-09-02-admin-mcp-server-design.md` (written for better-auth 1.6 — endpoints and consent design below supersede it).

- **Packages (better-auth 1.7, migration #323):** `better-auth`, `@better-auth/mcp` (the `mcp()` plugin **is** the OAuth provider — never also register `oauthProvider()`), `@better-auth/cimd`, `@better-auth/oauth-provider` and `@better-auth/core` (pinned `~1.7.x` together, one Dependabot group), and the v2 MCP SDK `@modelcontextprotocol/server` (`@modelcontextprotocol/client` in devDependencies, for tests). The 1.x `@modelcontextprotocol/sdk` is no longer a direct dependency.
- **Auth:** OAuth 2.1 via `jwt()` + `mcp()` + `cimd()` in `lib/auth/index.ts`. Access tokens are JWTs signed by the `jwt()` plugin (keys at `/api/auth/jwks` for outside callers; the MCP route reads them in memory, see "A Worker must not fetch its own public URL"), verified by `requireMcpAuth` in `app/api/mcp/route.ts` (signature, issuer, `aud` = the `resource`, expiry). Authorization server = `<SITE_URL>/api/auth`: endpoints are `/api/auth/oauth2/{authorize,token,consent,introspect,revoke,userinfo}` (not `/mcp/*` any more). `grantTypes` is limited to `authorization_code` + `refresh_token`.
- **Client registration = CIMD only, no DCR.** A client identifies itself by an HTTPS Client ID Metadata Document on its own domain (`client_id` = that URL, profile `mcp-2026-07-28`). **Never** enable `allowDynamicClientRegistration` or `allowUnauthenticatedClientRegistration` — anonymous registration is exactly what made the old forced-consent hook necessary. `POST /api/auth/oauth2/register` answers 403 "Client registration is disabled".
- **CIMD transport is ours:** `lib/auth/cimd-fetch.ts`. `@better-auth/cimd/node` cannot run on Workers here (`node:https.request` is not implemented in unenv). DNS pinning is not "skipped": `/node` needs it because it resolves in-process then connects (two resolutions); Workers `fetch` never resolves in-process, so there is no window to pin. What is unavailable is validating the *resolved* address; the substitutes are the platform's egress firewall and `isMetadataDocumentUrlAllowed`. Port **443 only** is a deliberate hardening (the library's `validateClientIdUrl` does not constrain ports; without it `/oauth2/authorize`, reachable unauthenticated, is a port scanner). Do not swap in the `/node` transport without checking it under workerd.
- **CIMD fetch policy (`lib/auth/cimd-policy.ts`):** `isMetadataDocumentUrlAllowed` refuses our own origin (`client_id` accepts a query string and could recurse into our own `/oauth2/authorize`) and, when `CIMD_ALLOWED_ORIGINS` is non-empty, any origin not listed. Elle contient `https://claude.ai` (vérifié : les deux documents répondent 200 `application/json` avec un `client_id` auto-référentiel) et `https://chatgpt.com` (Codex / ChatGPT desktop ; chemin variable par installation, origine non vérifiée par une récupération réelle — à confirmer à la première connexion). Cela referme l'oracle d'atteignabilité aveugle sur `/oauth2/authorize` : une origine hors liste est refusée avant toute récupération. Ajouter une origine sans vérifier son document, ou en retirer une, ré-ouvre cet oracle.
- **`redirect_uris` is NOT bound to the `client_id` origin** (`originBoundFields` deliberately excludes it in the library), and a CIMD refresh replaces `redirectUris` without invalidating stored consent. So the consent screen is load-bearing, and `onClientRefreshed` (`revokeConsentOnRedirectChange`) deletes the client's `oauthProviderConsent` rows whenever its `redirect_uris` change — otherwise whoever can write an approved client's document could redirect codes to another host with no prompt. The library calls it best-effort (errors are logged, not rolled back).
- **Resource:** `resource` = `<SITE_URL>/api/mcp` (`mcpResourceUrl()`), must be HTTPS in production (`https://netereka.ci/api/mcp`); better-auth accepts plain HTTP only on loopback, so `http://localhost:3000/api/mcp` works in dev.
- **Consent (the former `mcp-consent-hook.ts` is gone, on purpose):** in 1.7 the provider itself sends any client with no stored consent for this user to `consentPage`, `skip_consent` is forbidden in CIMD documents, and we never set `skipConsent` — so a brand-new/unknown client can no longer get a token silently (verified live: authorize with a session and no `prompt=consent` → redirect to `/admin/mcp/consent`). What remains is the consent screen itself: `/admin/mcp/consent` must keep showing the **client_id domain** (the identity) and the redirect host, is admin-only, and posts the signed OAuth query (`oauth_query = window.location.search`) that the server re-verifies. Trade-off accepted: once an admin consents, that same client re-authorizes without a prompt (stored in `oauthProviderConsent`). If you want a click every time, force `prompt=consent` in a `hooks.before` on `/oauth2/authorize` (`ctx.path`), and add a test.
- **Login resume:** `/admin/login` receives the signed query (`exp`, `sig`, …) from the provider and sends it as `oauth_query` in the `sign-in/email` body; the server answers `{ redirect: true, url }` (consent page). See `lib/auth/oauth-resume.ts`.
- **DB tables:** `jwks`, `oauthClient`, `oauthResource`, `oauthClientResource`, `oauthRefreshToken`, `oauthClientAssertion`, plus `oauthProviderAccessToken` / `oauthProviderConsent` (renamed via `mcp({ schema })` because `oauthAccessToken`/`oauthConsent` still hold the 1.6 shape). `oauthApplication`, `oauthAccessToken`, `oauthConsent` are **legacy, unused, empty in prod** — drop them in a separate "contract" PR after the 1.7 canary is promoted (DROP TABLE is blocked during canary). 1.7 also checks the schema at first request: a missing column (e.g. `session.impersonatedBy`, added in `0020`) makes every auth route 500 with `SCHEMA_MISMATCH`.
- **Authorization:** `lib/mcp/context.ts` re-reads the user from D1 on every request (`sub` of the JWT); only `admin`/`super_admin`, not banned. A `customer` can finish the OAuth flow but every call gets 403.
- **Tools:** `lib/mcp/tools/*.ts`, registered by `lib/mcp/server.ts`. All product writes go through `lib/db/product-drafts.ts`, whose every UPDATE/DELETE carries `is_draft = 1`. No tool can publish; that stays in the wizard.
- **Audit:** each write tool records `product.draft_*` in `audit_log` with `details.via = "mcp"`, committed in the same `db.batch()` as the mutation (every write in `product-drafts.ts` takes a `DraftAudit`). Image inserts resolve `is_primary`/`sort_order`/the 12-image limit inside the INSERT so concurrent calls stay consistent.
- **Discovery documents:** `/.well-known/oauth-protected-resource` and `/.well-known/oauth-protected-resource/api/mcp` (RFC 9728, forwarded to `auth.handler` — `mcp()` serves them), `/.well-known/oauth-authorization-server` and `/.well-known/oauth-authorization-server/api/auth` (RFC 8414 with the issuer path inserted; `oauthProviderAuthServerMetadata`). `WWW-Authenticate` on a 401 points to the second one.
- **Local test:** `claude mcp add --transport http netereka-local http://localhost:3000/api/mcp`, then `/mcp` in Claude Code — but the client must speak 2026-07-28 **and** publish a CIMD (a DCR-only client cannot register). For scripted tests, insert an `oauthClient` row (`clientId`, `redirectUris` JSON, `tokenEndpointAuthMethod='none'`, `grantTypes`, `responseTypes`) plus an `oauthClientResource` row linking it to `http://localhost:3000/api/mcp`, then walk authorize → sign-in (`oauth_query`) → `/oauth2/consent` → `/oauth2/token` (PKCE + `resource`) → `Client` from `@modelcontextprotocol/client` with `versionNegotiation: { mode: "auto" }`. Delete those rows afterwards.
- **Adding a tool:** `defineTool({ name, description, inputSchema: <zod raw shape>, handler })` in a `lib/mcp/tools/*.ts` file, add it to `ALL_TOOLS`, map domain errors to `fail(code, message)`; never let a stack trace reach the client. `lib/mcp/server.ts` wraps the raw shape in `z.object()` at registration (the v2 SDK wants an object schema) — one adapter, tool files unchanged.
- **A Worker must not fetch its own public URL (JWKS served in memory):** `requireMcpAuth` by default does `fetch(`${baseURL}/jwks`)`, i.e. the Worker calling itself over the internet. In production that subrequest fails on every call (`Error: Jwks failed: ` with no detail: a non-OK response with an empty `statusText`, non-JSON body) although the URL answers 200 from outside, so every `POST /api/mcp` was a 500 after a successful OAuth flow. It is NOT a canary-window problem and NOT a redirect (a redirect throws a different message, "returned an HTTP redirect"; verified under workerd). `@better-auth/mcp` only accepts `jwksUrl?: string`, no function, so `lib/mcp/local-jwks.ts` (`serveJwksLocally`) answers that one exact URL in memory from `auth.api.getJwks()` by wrapping `globalThis.fetch` once per isolate; the library still does all verification (signature, issuer, audience, expiry, DPoP, challenge) and keeps its 5-minute key cache. Never point `jwksUrl` back at a public URL of this Worker, and do not reimplement verification. Regression test: `__tests__/unit/api/mcp-route.test.ts` fails the JWKS HTTP URL loudly; only a real deploy proves the production path. Also: `POST /api/mcp` answers a JSON-RPC 500 (not an opaque Next 500) if `initAuth()` throws, e.g. `SCHEMA_MISMATCH`. Canary: the old (1.6) build has no JWKS/OAuth 1.7 endpoints, so promote quickly.

## Environment Drift Guard (`lib/drift/`)

Compares **what the code assumes of its environment** with **what that environment actually is**, in **both directions**. Born from two same-day incidents with opposite signs: `audit_log` carried a `FOREIGN KEY (actor_id) REFERENCES users(id)` that `schema.ts` never declared (surplus in reality — no audit write ever succeeded in prod), and `image-search.ts` read `env.BRAVE_API_KEY` while the deployed secret is `BRAVE_SEARCH_API_KEY` (shortfall). An ordinary drift check only looks for "declared but missing" and would have caught the second and missed the first entirely, so `present_non_declare` is first-class and printed **first**.

- **Engine** — pure functions, no I/O: `comparerBase()` and `comparerLiaisons()` take two descriptions, return typed `Ecart[]`. Testable without DB or network, which is how both incidents are replayed in `__tests__/unit/drift/incidents-reels.test.ts`.
- **Collectors** — `scripts/drift/`: `getTableConfig()` over `lib/db/schema.ts`; `sqlite_master` + `PRAGMA` (D1 exposes them as table-valued functions, so the whole DB shape costs 5 queries); the **TypeScript compiler API** for `env.d.ts` (never a regex — the file contains `BRAVE_API_KEY` in a comment); `wrangler versions view` + `secret list` + `wrangler.jsonc` vars for the Worker.
- **Three viewpoints:** `npm run check:drift` (`--local` / `--liaisons-seules` / `--base-seule`); `verifierLiaisonsUneFois()` wired into `lib/cloudflare/context.ts` (bindings only, once per isolate, logs loudly, **never throws** — the once-flag is set *inside* the try, or a throw there would break every `getDB()` on every request); `.github/workflows/drift.yml` nightly + `workflow_dispatch`.
- **Exit codes mean different things.** `0` ran, no error. `1` ran, found an error. **Anything else = the guard itself is broken** (expired token, `wrangler` output shape changed, missing dep) — the workflow maps non-0/1 to 2 and annotates it separately, because a silent breakdown must not read as known drift. **Warnings print but never fail**: counting them would make it red forever (18 nullable `TEXT PRIMARY KEY`s need 18 table rebuilds — nobody has decided to pay for that), and a permanently red guard is one people learn to ignore.
- **The alert has to reach someone.** A green scheduled run sends nothing, a red one emails only whoever last touched the cron, and **GitHub disables scheduled workflows after 60 days of repo inactivity** — the guard can stop without a word. So the job opens/updates an issue labelled `derive` and **closes it when the report goes green again**.
- **Deliberately NOT compared:** column types (SQLite affinity is too loose), default values (`datetime('now')` has several spellings), CHECK expressions, index sort order, `ON DELETE`/`ON UPDATE`. Prefer reporting less and right — a guard that cries wrongly gets disabled.
- **Three false-positive classes already removed** (found by running it against prod): unicity is compared **by columns, never by name** (drizzle-kit names `<table>_<col>_unique` what a hand-written migration writes inline and anonymous — 16 false pairs); a nullable `TEXT PRIMARY KEY` is a SQLite legacy, grouped under one `motif` as a warning; a named CHECK facing an anonymous one in base is a warning, not an absence.
- **`LIAISONS_DECLAREES` mirrors `env.d.ts` for runtime** (types are erased). A test re-reads `env.d.ts` with the compiler and demands equality, name by name and `?` by `?` — the guard applied to itself.
- **Drift at 2026-10-04: 0 errors** — the seven known at 2026-10-02 were all settled *before* shipping, in both directions. Three indexes (`idx_promo_codes_code`, `idx_session_token`, `idx_user_email`), inherited from the hand-written migrations and absent from `schema.ts`, were **declared** (a table rebuild would have silently dropped the two carrying `session.token` and `user.email`). Four secrets (`ANTHROPIC_API_KEY`, `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID`, `OPENROUTER_API_KEY`) that **no code here read** were **deleted from the Worker**. The order mattered: a guard red on day one is a guard people learn to ignore, so the first alert has to be real information. Warnings (18 nullable `TEXT PRIMARY KEY`s, a SQLite legacy that needs 18 table rebuilds) are **printed but do not fail** — counting them would have made it red forever. **Do not silence anything with an exception list**: that is exactly what let the `audit_log` FK survive.

## Release Pipeline

Full reference : **[`docs/RELEASE_PIPELINE.md`](./docs/RELEASE_PIPELINE.md)**.

Quick mental model :

- **Deploy** (each merge on `main`) ≠ **Promote** (manual, canary 10% → 100%) ≠ **Release** (merge a release-please PR → SemVer tag + CHANGELOG).
- Six workflows : `ci.yml`, `deploy.yml` (canary 10/90), `promote.yml`, `rollback.yml`, `deploy-whatsapp.yml`, `release-please.yml`.
- Migrations must be backward-compatible (expand/contract). `scripts/check-migration-safety.mjs` blocks `DROP COLUMN / DROP TABLE / RENAME COLUMN / ALTER NOT NULL without DEFAULT / DROP UNIQUE INDEX` in pre-commit and CI. Bypass marker : `-- migration-safety: acknowledged reason="..."`.
- Conventional Commits required (enforced via commitlint `commit-msg` hook). Scopes : `storefront / admin / whatsapp / auth / db / seo / claude / ci / deps / release`.
- Local tooling : `npm run rollback`, `npm run promote`, `npm run versions:list`, `npm run check:migrations`, `npm run observe`.
- **Observing one version before it reaches anyone** (`npm run observe`, runbook F) : an override header on `netereka.ci` routes one request to one version, **on the zone** — so images, session and Turnstile behave as in production. A Version URL cannot do this : it lives off the zone, where `/cdn-cgi/image/` does not exist and the homepage loses all 471 of its images (measured 2026-10-04). **An override that does not apply is ignored, not refused** : you get a normal 200 from another version. `GET /api/version` (binding `CF_VERSION_METADATA`) is what makes it verifiable; `--verifier` does that comparison. `workers_dev` is `false` and `preview_urls` `true`, both written explicitly — since wrangler 4.44 the second silently follows the first when omitted.

Always prefer the GitHub workflows (`promote.yml` / `rollback.yml`) over `wrangler` CLI or the Cloudflare dashboard : the workflows audit-trail the action, re-seed the hero KV on promote, and auto-close the "Pending promotion" issue.

**Operational lessons (hard-learned)** :

- **Canary = two builds live at once, and Cloudflare routes per request at random.** Without version affinity a browser gets HTML from one version and 404s on the other version's hashed chunks (`Failed to load chunk … from module N`, or a 500 when the chunk belongs to the root layout). A zone Transform Rule sets `Cloudflare-Workers-Version-Key: ip.src` to pin each client to one version; it is managed by `npm run cf:version-affinity` (idempotent, needs a token with Zone:Read + Transform Rules:Edit). Re-run it if the rule disappears from the dashboard. See `docs/RELEASE_PIPELINE.md` → Version affinity.
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
