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
- **Auth:** better-auth with Cloudflare Turnstile captcha
- **Backend Services:** Cloudflare D1 (SQLite), KV, R2 (images)

## Commands

```bash
npm run dev             # Start dev server (localhost:3000, Turbopack)
npm run build           # Production build
npm run build:worker    # Build for Cloudflare Workers
npm run preview         # Preview with wrangler
npm run deploy          # Build and deploy to Cloudflare
npm run lint            # ESLint

# Database (local D1)
npm run db:migrate      # Run migrations
npm run db:seed         # Seed initial data
npm run db:seed-catalogue  # Seed product catalogue
```

No test framework is configured yet.

## Architecture

### Route Groups

- `app/(storefront)/` — Public store: home, products (`/p/[slug]`), categories (`/c/[slug]`), cart, checkout, auth, account
- `app/(admin)/` — Protected admin: dashboard, products CRUD, categories, orders management
- `app/api/auth/[...all]/` — better-auth API routes

### Key Directories

- `actions/` — Server Actions organized by domain (`checkout.ts`, `reviews.ts`, `admin/orders.ts`, etc.)
- `lib/db/` — D1 query helpers with `query<T>()`, `queryFirst<T>()`, `execute()`, `batch()`
- `lib/db/types.ts` — TypeScript interfaces for all DB entities (Product, Order, Category, etc.)
- `lib/auth/guards.ts` — Auth guards: `requireAuth()`, `requireAdmin()`, `requireGuest()`, `getOptionalSession()`
- `lib/cloudflare/context.ts` — `getDB()`, `getKV()`, `getR2()` helpers via `getCloudflareContext()`
- `lib/validations/` — Zod schemas for forms (checkout, account, address, review)
- `stores/` — Zustand stores (cart persisted to localStorage)
- `components/ui/` — shadcn/ui base components
- `components/storefront/` — Store components (header, product-card, checkout-form)
- `components/admin/` — Admin components (sidebar, data-tables, order management)

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

D1 SQLite with raw SQL queries. Prices stored as integers (XOF, no decimals). Migrations in `db/migrations/`, seeds in `db/seeds/`.

## Reference Documents

- `NETEREKA_Architecture_Ecommerce_Cloudflare.md` — Full technical architecture and DB schema
- `NETEREKA_Design_System.md` — Colors, typography, spacing, component specs
- `NETEREKA_Plan_Developpement.md` — 4-week development timeline with task tracking and checklists
- `NETEREKA_Homepage_Concept.jsx` — Homepage component prototype

## MCP Servers

The shadcn MCP server is configured (`.mcp.json`) for component scaffolding via `npx shadcn@latest`.
