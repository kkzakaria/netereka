# Design: Guided Product Creation Form

**Date:** 2026-02-18
**Status:** Approved

## Summary

Redesign the admin product creation and editing pages into a single sectioned form with scroll spy navigation and cascading category selector supporting subcategories.

## Key Decisions

- **Format:** Scrollable form with visual sections (Cards) + sticky side navigation with scroll spy
- **Category selector:** Cascading two-dropdown pattern (parent → subcategory)
- **Images/Variants in creation:** Auto-create a draft product (`is_draft` column) on page load to get a real `product_id` for image uploads and variant creation
- **Missing fields:** Expose `low_stock_threshold`, `weight_grams`, `meta_title`, `meta_description`
- **Unified layout:** Same sectioned layout for both creation and editing (replaces current tab-based edit page)

## Layout

```
┌─────────────────────────────────────────────────────┬──────────────────┐
│  Form Sections (3/4 width, scrollable)              │  Side Nav (1/4)  │
│                                                     │  sticky          │
│  ┌─ Card: Informations générales ─────────────────┐ │  ● Informations  │
│  │ Nom, Slug, Marque, SKU, Descriptions           │ │  ○ Catégorie     │
│  └────────────────────────────────────────────────┘ │  ○ Tarification   │
│                                                     │  ○ Caractéris.   │
│  ┌─ Card: Catégorie ─────────────────────────────┐  │  ○ Images        │
│  │ [Catégorie parente ▼]                         │  │  ○ Variantes     │
│  │ [Sous-catégorie ▼] (conditionnel)             │  │  ○ SEO           │
│  └────────────────────────────────────────────────┘ │  ○ Visibilité    │
│                                                     │                  │
│  ┌─ Card: Tarification & Stock ──────────────────┐  │  [Créer produit] │
│  │ Prix base, Prix barré, Stock, Seuil alerte    │  │  ou              │
│  └────────────────────────────────────────────────┘ │  [Mettre à jour] │
│                                                     │                  │
│  ┌─ Card: Caractéristiques ──────────────────────┐  │                  │
│  │ Poids (grammes)                               │  │                  │
│  └────────────────────────────────────────────────┘ │                  │
│                                                     │                  │
│  ┌─ Card: Images ────────────────────────────────┐  │                  │
│  │ <ImageManager productId={id} />               │  │                  │
│  └────────────────────────────────────────────────┘ │                  │
│                                                     │                  │
│  ┌─ Card: Variantes ────────────────────────────┐   │                  │
│  │ <VariantList productId={id} variants={[]} />  │  │                  │
│  └────────────────────────────────────────────────┘ │                  │
│                                                     │                  │
│  ┌─ Card: SEO ───────────────────────────────────┐  │                  │
│  │ Meta title (60 chars), Meta description (160) │  │                  │
│  └────────────────────────────────────────────────┘ │                  │
│                                                     │                  │
│  ┌─ Card: Visibilité ───────────────────────────┐   │                  │
│  │ Switch actif, Switch mis en avant            │   │                  │
│  └────────────────────────────────────────────────┘ │                  │
└─────────────────────────────────────────────────────┴──────────────────┘
```

## Sections Detail

### 1. Informations générales
- `name` (required, text)
- `slug` (auto-generated from name, editable)
- `brand` (text)
- `sku` (text)
- `short_description` (text input)
- `description` (textarea, 5 rows)

### 2. Catégorie
- **Select 1 "Catégorie":** Shows only root categories (`depth === 0`)
- **Select 2 "Sous-catégorie":** Appears conditionally when the selected parent has children. Shows subcategories where `parent_id === selectedParentId`
- Submitted `category_id` = subcategory ID if selected, otherwise parent ID
- Page passes `CategoryWithCount[]` (includes `depth`, `parent_name`, `parent_id`) instead of flat `{id, name}`

### 3. Tarification & Stock
- `base_price` (required, integer, FCFA)
- `compare_price` (optional, integer)
- `stock_quantity` (integer, min 0)
- `low_stock_threshold` (integer, default 5) — NEW

### 4. Caractéristiques physiques
- `weight_grams` (integer, optional) — NEW

### 5. Images
- Reuses existing `ImageManager` component
- Works immediately because the draft product provides a real `product_id`

### 6. Variantes
- Reuses existing `VariantList` component
- Same — draft product ID enables variant CRUD

### 7. SEO
- `meta_title` (text, with character counter, max 60 suggested) — NEW
- `meta_description` (textarea, with character counter, max 160 suggested) — NEW

### 8. Visibilité
- `is_active` (switch, default off for new products)
- `is_featured` (switch, default off)

## Draft Product Flow

1. User navigates to `/admin/products/new`
2. Server action `createDraftProduct()` runs:
   - Generates `nanoid()` ID
   - Inserts product with `is_draft: 1`, `is_active: 0`, `name: ""`, `base_price: 0`
   - Redirects to `/admin/products/{id}/edit?new=1`
3. Edit page detects `?new=1`:
   - Shows "Créer le produit" button (not "Mettre à jour")
   - Submit action sets `is_draft: 0` and validates all required fields
   - Cancel/back navigates away — orphaned drafts cleaned up by periodic check or on next list page load
4. Product listing page filters out `is_draft = 1` products

### Schema Change

Add `is_draft` column to `products` table:
```sql
ALTER TABLE products ADD COLUMN is_draft INTEGER NOT NULL DEFAULT 0;
```

Update Drizzle schema in `lib/db/schema.ts` accordingly.

## Scroll Spy Implementation

- Each section Card has a unique `id` attribute (`section-general`, `section-category`, etc.)
- `IntersectionObserver` with `threshold: 0.3` observes all section elements
- State `activeSection` updates when a section enters the viewport
- Side nav renders `<a href="#section-xxx">` links styled with active indicator (left border or background color)
- Clicking a nav item smooth-scrolls to the section

## Components

### New Components
- `ProductFormSections` — main form component with all sections (replaces `ProductForm`)
- `CategoryCascadingSelect` — cascading parent/subcategory selector
- `SectionNav` — sticky side navigation with scroll spy
- `CharCounter` — small character counter for SEO fields

### Reused Components
- `ImageManager` — unchanged
- `VariantList` — unchanged
- shadcn `Card`, `Select`, `Switch`, `Input`, `Textarea`, `Label`, `Button`

## Pages Modified

- `/admin/products/new/page.tsx` — creates draft, redirects to edit
- `/admin/products/[id]/edit/page.tsx` — uses sectioned layout (replaces tabs)

## Server Actions Modified

- `actions/admin/products.ts`:
  - Add `createDraftProduct()` — creates minimal draft
  - Update `updateProduct()` — handle `is_draft → false` transition, add new fields
  - Update `productSchema` — add `low_stock_threshold`, `weight_grams`, `meta_title`, `meta_description`
  - Add `cleanupDraftProducts()` — delete drafts older than 24h with no name/images
