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

# Database (Drizzle ORM + local D1)
npm run db:generate        # Generate SQL migrations from schema changes
npm run db:studio          # Open Drizzle Studio (visual DB browser)
npm run db:migrate:legacy  # Run legacy SQL migrations (initial setup)
npm run db:seed            # Seed initial data
npm run db:seed-catalogue  # Seed product catalogue
```

No test framework is configured yet.

## Architecture

### Route Groups

- `app/(storefront)/` — Public store: home, products (`/p/[slug]`), categories (`/c/[slug]`), cart, checkout, account, search, contact, static pages (`/a-propos`, `/faq`, `/livraison`, `/conditions-generales`)
- `app/(admin)/` — Protected admin: dashboard, products CRUD, categories, orders, customers, users, audit-log
- `app/(admin-auth)/` — Admin login page (separate layout, no admin sidebar)
- `app/(auth)/` — Customer auth: sign-in, sign-up, forgot-password, reset-password (no header/footer)
- `app/api/auth/[...all]/` — better-auth API routes

### Key Directories

- `actions/` — Server Actions organized by domain (`checkout.ts`, `reviews.ts`, `search.ts`, `wishlist.ts`, `addresses.ts`, `account.ts`, `admin/*.ts`)
- `lib/db/` — D1 query helpers with `query<T>()`, `queryFirst<T>()`, `execute()`, `batch()`
- `lib/db/drizzle.ts` — Drizzle ORM client via `getDrizzle()` (for new code)
- `lib/db/schema.ts` — Drizzle schema definitions for all tables
- `lib/db/types.ts` — TypeScript interfaces for all DB entities (Product, Order, Category, etc.)
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

D1 SQLite with Drizzle ORM. Prices stored as integers (XOF, no decimals). Schema defined in `lib/db/schema.ts`, legacy migrations in `db/migrations/`, seeds in `db/seeds/`.

Two DB access patterns coexist (gradual migration in progress):
- **Raw SQL** (legacy): `query<T>()`, `queryFirst<T>()`, `execute()`, `batch()` in `lib/db/index.ts`
- **Drizzle ORM** (new code): `getDrizzle()` from `lib/db/drizzle.ts`

Schema changes workflow: edit `lib/db/schema.ts` → run `npm run db:generate` → apply generated SQL via `wrangler d1 execute`.

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
- **Local D1 bootstrap:** Before `npm run db:studio` works, you must initialize the local D1 SQLite file first: `npx wrangler d1 execute netereka-db --local --command "SELECT 1"`. Then run the legacy migration and seed scripts.
- **SEO files:** `app/robots.ts` and `app/sitemap.ts` generate SEO metadata dynamically.
- **Drizzle remote mode:** To use `drizzle-kit` against remote D1, set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, and `CLOUDFLARE_D1_TOKEN` env vars.

## Authentication (better-auth)

Server config in `lib/auth/index.ts`, client in `lib/auth/client.ts`, guards in `lib/auth/guards.ts`.

- **DB adapter:** Kysely + D1Dialect (not Drizzle — better-auth uses Kysely internally)
- **Auth methods:** Email/password + social (Google, Facebook, Apple)
- **Captcha:** Cloudflare Turnstile plugin on all auth endpoints
- **Custom user fields:** `phone` (required, user input) and `role` (default `"customer"`, server-only)
- **Roles:** `"customer"`, `"admin"`, `"super_admin"` — checked in `requireAdmin()`
- **Session:** 7-day expiry, 5-minute cookie cache
- **Rate limiting:** 30 req/min general, 5/min for sign-in/sign-up, 3/min for forgot-password

**Auth guards** (use in Server Components and Server Actions):
- `requireAuth()` — Redirects to `/auth/sign-in` if not authenticated
- `requireAdmin()` — Requires `admin` or `super_admin` role, redirects to `/`
- `requireGuest()` — Redirects to `/` if already authenticated
- `getOptionalSession()` — Returns session or `null`, no redirect

**Client-side:** Import `authClient` from `@/lib/auth/client` (uses `inferAdditionalFields` for typed custom fields).

## Reference Documents

- `NETEREKA_Architecture_Ecommerce_Cloudflare.md` — Full technical architecture and DB schema
- `NETEREKA_Design_System.md` — Colors, typography, spacing, component specs
- `NETEREKA_Plan_Developpement.md` — 4-week development timeline with task tracking and checklists
- `NETEREKA_Homepage_Concept.jsx` — Homepage component prototype

## MCP Servers

The shadcn MCP server is configured (`.mcp.json`) for component scaffolding via `npx shadcn@latest`.
