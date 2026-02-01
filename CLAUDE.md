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
- **State Management:** Zustand (planned)
- **Forms:** React Hook Form + Zod (planned)
- **Backend Services:** Cloudflare D1 (SQLite), KV (cache/sessions/cart), R2 (images/files), Queues (email/WhatsApp)

## Commands

```bash
npm run dev       # Start dev server (localhost:3000, Turbopack)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
```

No test framework is configured yet.

## Architecture

### Route Groups (planned structure from architecture doc)

- `app/(storefront)/` — Public-facing store routes (home, products, categories, cart, checkout, auth, account)
- `app/(admin)/` — Protected admin routes (dashboard, products CRUD, orders, customers, promo-codes, reports)
- `app/api/` — API routes (auth callbacks, webhooks, cron jobs). Server Actions preferred over API routes.

### Key Directories (planned)

- `actions/` — Server Actions organized by domain (products, cart, orders, auth, admin/)
- `components/ui/` — shadcn/ui base components
- `components/storefront/` — Store-specific components (header, footer, product-card, cart-drawer)
- `components/admin/` — Admin-specific components (sidebar, data-table, stats)
- `components/shared/` — Shared components (loading, error-boundary)
- `lib/db/` — D1 database query helpers
- `lib/auth/` — Authentication helpers (session, OAuth, password)
- `lib/storage/` — R2 storage helpers
- `lib/notifications/` — Email (Resend/Brevo) and WhatsApp integration
- `lib/cloudflare/` — Cloudflare bindings and context helpers
- `lib/utils.ts` — `cn()` utility for class merging (clsx + tailwind-merge)

### Component Patterns

- Components use `data-slot` attributes for styling/selection (e.g., `data-slot="button"`)
- Button variants defined via CVA with sizes: `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`
- Composite component pattern for complex components (Card → CardHeader, CardTitle, CardContent, etc.)
- Use `"use client"` directive only when needed (interactivity, hooks)

### Design System

- **Primary colors:** Navy Blue (#183C78) + Mint Green (#00FF9C)
- **Design philosophy:** Premium and clean, inspired by Apple/Google Store, mobile-first
- **Accessibility:** Min 44px touch targets, high contrast, WCAG compliance
- CSS variables use oklch color space with light/dark theme support
- Reference `NETEREKA_Design_System.md` for full specifications

### Cloudflare Platform

- **D1** — SQLite database for all relational data (products, orders, users). Prices stored as integers (XOF, no decimals).
- **KV** — Session cache, cart persistence, site configuration
- **R2** — Product images, PDF invoices, CSV exports
- **Queues** — Async processing for email and WhatsApp notifications

## Reference Documents

- `NETEREKA_Architecture_Ecommerce_Cloudflare.md` — Full technical architecture, DB schema, API endpoints, security
- `NETEREKA_Design_System.md` — Colors, typography, spacing, component specs, Tailwind implementation
- `NETEREKA_Plan_Developpement.md` — 4-week development timeline and milestones
- `NETEREKA_Homepage_Concept.jsx` — Homepage component prototype

## MCP Servers

The shadcn MCP server is configured (`.mcp.json`) for component scaffolding via `npx shadcn@latest`.
