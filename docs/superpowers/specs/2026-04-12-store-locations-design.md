# Store Locations Management

**Date:** 2026-04-12
**Status:** Approved

## Problem

The store's physical location (Google Maps URL) is hardcoded in the storefront header. If NETEREKA opens additional physical stores, there's no way to manage them dynamically. The admin panel needs a way to manage stores, and the storefront needs to handle multiple locations gracefully.

## Design

### Database

New `stores` table in `lib/db/schema.ts`:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PK, nanoid | Unique identifier |
| `name` | text | not null | Store name (e.g. "NETEREKA Cocody") |
| `address` | text | not null | Display address |
| `google_maps_url` | text | not null | Full Google Maps link |
| `phone` | text | nullable | Contact phone |
| `email` | text | nullable | Contact email |
| `opening_hours` | text | nullable | Free text (e.g. "Lun-Sam 9h-19h") |
| `is_active` | integer | default 1 | 1 = visible, 0 = hidden |
| `sort_order` | integer | default 0 | Display order (ascending) |
| `created_at` | text | ISO timestamp | Creation date |
| `updated_at` | text | ISO timestamp | Last modification |

Seed migration inserts the current hardcoded NETEREKA store to avoid regression.

### Admin — CRUD in Dialog (`/stores`)

**Approach:** Single-page CRUD with Sheet dialogs (no separate `/new` or `/[id]/edit` routes). The store entity is simple (8 fields) and doesn't warrant dedicated pages.

**Sidebar:** Add "Boutiques" entry with `StoreLocation01Icon`, `minRole: "admin"`.

**Page list (`app/(admin)/stores/page.tsx`):**
- Table with columns: Nom, Adresse, Téléphone, Statut (actif/inactif), Actions
- Mobile: stacked cards (existing pattern)
- "Ajouter une boutique" button at top
- Row actions: Edit, Toggle active, Delete

**Sheet form (create/edit):**
- Fields: Nom, Adresse, URL Google Maps, Téléphone, Email, Horaires, Ordre d'affichage
- Zod validation: name, address, google_maps_url required; email validated if provided; URL format validated
- French error messages

**Server Actions (`actions/admin/stores.ts`):**
- `createStore(formData)` — Create store
- `updateStore(id, formData)` — Update store
- `toggleStoreActive(id)` — Toggle active/inactive
- `deleteStore(id)` — Delete store

All protected by `requireAdmin()`, with `revalidatePath()` after mutations.

**DB queries (`lib/db/admin/stores.ts`):**
- `getAllStores()` — All stores for admin list
- `getStoreById(id)` — Single store for edit form

### Storefront — Dynamic Header Icon

**Conditional behavior based on active store count:**
- **0 active stores:** Icon hidden
- **1 active store:** Direct `<a>` link to Google Maps (current behavior)
- **2+ active stores:** `Popover` (shadcn) opens on click

**Popover content (per store item, clickable):**
- Store name (bold)
- Address (secondary text)
- Phone (secondary text)
- Click opens Google Maps in new tab

**Data flow:**
- `getActiveStores()` in `lib/db/stores.ts` — returns active stores sorted by `sort_order`
- Called server-side in `Header` (Server Component)
- Data passed as props to `StoreLocationButton` (Client Component)

**Components:**
- `Header` (server) — fetches stores, passes to `StoreLocationButton`
- `StoreLocationButton` (client) — conditional rendering: nothing / direct link / popover

Remove the hardcoded `STORE_GOOGLE_MAPS_URL` constant.

### Files to Create/Modify

**New files:**
- `lib/db/schema.ts` — Add `stores` table definition
- `drizzle/*.sql` — Generated migration
- `lib/db/admin/stores.ts` — Admin DB queries
- `lib/db/stores.ts` — Storefront DB query (`getActiveStores`)
- `lib/validations/store.ts` — Zod schema
- `actions/admin/stores.ts` — Server actions
- `app/(admin)/stores/page.tsx` — Admin list page
- `app/(admin)/stores/stores-page-client.tsx` — Client wrapper
- `app/(admin)/stores/store-form-sheet.tsx` — Sheet with create/edit form
- `app/(admin)/stores/loading.tsx` — Loading skeleton
- `components/storefront/store-location-button.tsx` — Client component for header

**Modified files:**
- `components/admin/sidebar.tsx` — Add "Boutiques" nav entry
- `components/storefront/header.tsx` — Replace hardcoded URL with dynamic `StoreLocationButton`
