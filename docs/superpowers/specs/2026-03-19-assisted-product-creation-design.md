# Assisted Product Creation — Design Spec

**Date:** 2026-03-19
**Status:** Approved

## Context

The current product creation flow presents a single long form with 8 sections (General Info, Category, Pricing, Specs, Images, Variants, SEO, Visibility). Admins report it feels intimidating, the order isn't always logical, and fields lack guidance. This spec redesigns the form as a guided 4-step wizard.

No AI-assisted content generation in scope — that is deferred for a future iteration.

## Scope

This wizard applies to **new product creation only** (products where `is_draft = 1`). Already-published products continue to use the existing `ProductFormSections` component unchanged. The two components coexist: the edit page renders `ProductWizard` when `product.is_draft === 1`, and `ProductFormSections` otherwise.

**Migration note:** Any existing draft product accessed after this feature is deployed will use the wizard instead of the old form. This is the desired behavior — in-progress drafts will benefit from the guided flow.

## Design

### Structure: 4-Step Wizard

A step-by-step wizard renders inside the existing `/products/[id]/edit` page. The draft-first flow (`createDraftProduct()` → redirect to edit) is preserved.

#### Step 1 — Identité
Fields:
- **Nom du produit** (required) — placeholder: `ex: Samsung Galaxy A55 128Go Noir` — helper text: *Soyez précis : marque, modèle, capacité, couleur si pertinent.*
- **Marque** (optional) — placeholder: `ex: Samsung`
- **SKU** (optional, editable) — helper text: *Laissez vide si vous n'avez pas de référence interne.* Light background styling but field remains fully editable — value appears in FormData when provided. No auto-generation.
- **Catégorie** (required) — two-level cascading select (existing `CategoryCascadingSelect`)

Contextual hint (blue): *"Ces 3 champs suffisent pour passer à l'étape suivante. Vous pourrez toujours revenir pour compléter."*

Validation to advance: `name` non-empty and `category_id` non-empty.

#### Step 2 — Prix & Stock
Fields:
- **Prix de base** (required, integer XOF) — FCFA badge on input, placeholder: `ex: 125000`
- **Prix barré** (optional) — tooltip: *Ancien prix avant promotion. Affiché barré sur la fiche produit.*
- **Quantité en stock** (integer, default 0)
- **Seuil d'alerte stock faible** (integer, default 5) — tooltip: *Vous recevrez une alerte lorsque le stock passe sous ce seuil.*
- **Poids** (optional, grams) — tooltip: *Utilisé pour le calcul des frais de livraison.*

Validation to advance: `base_price` is a non-negative integer.

#### Step 3 — Médias
Two sub-sections:
1. **Images** — existing `ImageManager` + `ImageUpload` components, unchanged
2. **Variantes** — existing `VariantList` + `VariantForm` components, unchanged

Contextual hint (amber): *"Au moins une image est recommandée avant publication."*

No validation required to advance. `ImageManager` and `VariantList` manage their own async flows independently — they are not disabled during the wizard's `useTransition` pending state (their mutations are fire-and-forget relative to the wizard).

#### Step 4 — Finalisation
Fields:
- **Résumé court** (optional, single-line text) — placeholder: `ex: Smartphone 128Go avec triple caméra 50MP`
- **Description** (optional) — existing `RichTextEditor`
- **Titre SEO** (optional, max 60 chars) — live character counter `{n}/60`
- **Meta-description** (optional, max 160 chars) — live character counter `{n}/160`, textarea
- **Publier immédiatement** (`is_active`) toggle — default off
- **Mettre en avant** (`is_featured`) toggle — default off

Final buttons (two distinct actions):
- **"Publier le produit"** — forces `is_active = 1` into FormData, then calls `updateProduct(id, formData)`. `updateProduct` sets `is_draft = 0` and `is_active = 1`. Client-side redirect to `/products` with success toast after receiving `{ success: true }`.
- **"Enregistrer comme brouillon"** — calls `saveDraftStep(id, formData)` for Step 4 fields only, preserving `is_draft = 1`. Client-side redirect to `/products` with a "Brouillon enregistré" toast.

The `is_active` toggle in Step 4 is only relevant for the "Publier" path. When saving as draft, `is_active` is saved via `saveDraftStep` (see table below) but `is_draft` remains 1 — the product stays invisible on the storefront regardless of `is_active`. The UI does not disable the toggle when saving as draft.

Note: `updateProduct` unconditionally sets `is_draft = 0`. Therefore only "Publier" calls `updateProduct`. "Enregistrer comme brouillon" uses `saveDraftStep` to avoid inadvertently clearing the draft flag.

### Navigation

**Stepper bar** (top of wizard):
- Completed steps (index < current): filled navy circle (#183C78), white number, clickable
- Current step: navy outline circle (white fill, navy border), navy number, not clickable
- Future steps (index > current): grey circle, grey number, not clickable
- Connector lines: grey by default, filled navy when the step to the left is completed

**Buttons:**
- "Suivant →" advances (validates current step's required fields, then calls `saveDraftStep`). Shows inline spinner + disabled while the server action is in flight (`useTransition` + `isPending`). All form inputs in the current step are also disabled during pending.
- "← Précédent" goes back — no save, no validation, instant
- Step 1 has no "Précédent" button
- Step 4 replaces "Suivant" with the two final buttons described above

**Slug handling:**
Slug is not exposed in the wizard UI. `saveDraftStep` auto-derives slug from `name` (via `slugify`) if name is provided and slug is currently empty, matching `updateProduct` behavior. Slug collision returns `{ success: false, error: "..." }` and shows an error toast — the user does not advance.

### States

**Loading:** "Suivant" button shows inline spinner and is disabled. Form inputs in the current step are disabled. Step 3 child components (`ImageManager`, `VariantList`) are unaffected.

**Save error:** Sonner error toast with the server-returned message. Wizard stays on the current step. User can retry.

**Navigate away:** No `beforeunload` prompt. Auto-save happens on each "Suivant" click. If the admin navigates away before clicking "Suivant", any unsaved edits in the current step are lost — this is acceptable. The draft persists in DB with the data from the last successful save. `cleanupDraftProducts()` only removes drafts older than 24 hours with `name = ''`, so partially-filled drafts survive.

**Resume (returning to an in-progress draft):** The wizard loads with all previously saved values pre-filled. The starting step is determined as follows:
- Step 1 if `name` is empty
- Step 2 if `name` and `category_id` are set but `base_price` is 0
- Step 3 if `name`, `category_id`, and `base_price > 0` are set but no primary image exists
- Step 4 otherwise (all required fields set and at least one image uploaded)

### Technical Approach

**Preserved unchanged:** `createDraftProduct()`, `updateProduct()`, `ProductFormSections`.

**New server action — `saveDraftStep(id: string, formData: FormData): Promise<ActionResult>`**

Handles partial saves during wizard navigation. Preserves `is_draft = 1`.

Accepted fields per step (only fields present in FormData are updated — absent fields are ignored via partial SQL):

| Step | Fields saved |
|------|-------------|
| 1 | `name`, `brand`, `sku`, `category_id` |
| 2 | `base_price`, `compare_price`, `stock_quantity`, `low_stock_threshold`, `weight_grams` |
| 3 | *(no fields — media handled by existing image/variant actions)* |
| 4 (draft) | `short_description`, `description`, `meta_title`, `meta_description`, `is_active`, `is_featured` |

Validation per step:
- Step 1: `name` non-empty, `category_id` non-empty
- Step 2: `base_price` is a non-negative integer
- Step 3: none
- Step 4: `meta_title` max 60 chars, `meta_description` max 160 chars

Slug behavior: if `name` is in the payload, `name` is non-empty, and the product's current slug starts with `draft-` (the format set by `createDraftProduct`), auto-derive new slug from `name` via `slugify`. Check for collision (excluding self). Return error on collision. If `name` is empty, skip slug derivation.

`revalidatePath`: `saveDraftStep` does NOT call `revalidatePath`. Drafts are excluded from the storefront and the admin products list, so no cache invalidation is needed for partial saves.

**Component structure:**
```
components/admin/
  product-wizard.tsx            # Main wizard client component ("use client")
  product-wizard/
    step-identity.tsx           # Step 1
    step-pricing.tsx            # Step 2
    step-media.tsx              # Step 3
    step-finalization.tsx       # Step 4
    wizard-stepper.tsx          # Stepper bar
```

**`ProductWizard` props:**
```typescript
// CategoryOption imported from components/admin/category-cascading-select
// (4-field version: id, name, depth, parent_id) — NOT the 2-field version from lib/db/types
interface ProductWizardProps {
  product: ProductDetail;
  categories: CategoryOption[];
}
```

**Conditional render in edit page:**
```typescript
// app/(admin)/products/[id]/edit/page.tsx
{product.is_draft
  ? <ProductWizard product={product} categories={categories} />
  : <ProductFormSections product={product} categories={categories} />}
```

The edit page already fetches `categories` as `CategoryOption[]` — no change needed to data fetching.

**Existing components reused as-is:**
- `CategoryCascadingSelect` (Step 1)
- `ImageManager` + `ImageUpload` (Step 3)
- `VariantList` + `VariantForm` (Step 3)
- `RichTextEditor` (Step 4)

### Guidance Elements

| Element | Purpose | Implementation |
|---------|---------|----------------|
| Placeholder | Show expected format/example | `placeholder` prop on input |
| Helper text | Short hint below field | Small grey `<p>` under input |
| Tooltip `?` | Explain non-obvious fields | Radix `Tooltip` component |
| Step hint | Minimum required to advance | Blue or amber info box in step body |
| Character counter | Live feedback for SEO fields | Controlled input + `{n}/{max}` display |
| Loading state | Prevent double-submit | `isPending` from `useTransition`, spinner on button, inputs disabled |

### Out of Scope

- AI-generated descriptions or SEO suggestions (deferred)
- Bulk product import (CSV, barcode)
- Product templates by category
- Mobile-optimized stepper (mobile stacks linearly, same as today)
- Wizard for editing already-published products
- SKU auto-generation (not implemented in existing actions; field is optional, stored as NULL if empty)
