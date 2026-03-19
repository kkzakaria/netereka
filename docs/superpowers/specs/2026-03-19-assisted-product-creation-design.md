# Assisted Product Creation — Design Spec

**Date:** 2026-03-19
**Status:** Approved

## Context

The current product creation flow presents a single long form with 8 sections (General Info, Category, Pricing, Specs, Images, Variants, SEO, Visibility). Admins report it feels intimidating, the order isn't always logical, and fields lack guidance. This spec redesigns the form as a guided 4-step wizard.

No AI-assisted content generation in scope — that is deferred for a future iteration.

## Design

### Structure: 4-Step Wizard

A step-by-step wizard replaces the scrolling 8-section form. The wizard renders inside the existing `/products/[id]/edit` page (the draft-first flow is preserved).

#### Step 1 — Identité
Fields:
- **Nom du produit** (required) — placeholder: `ex: Samsung Galaxy A55 128Go Noir` — hint below: *Soyez précis : marque, modèle, capacité, couleur si pertinent.*
- **Marque** (optional) — placeholder: `ex: Samsung`
- **SKU** (optional) — labeled "auto-généré", placeholder: *Laissez vide pour générer automatiquement*, input disabled-style (light background)
- **Catégorie** (required) — two-level cascading select (existing `CategoryCascadingSelect` component)

Contextual hint (blue): *"Ces 3 champs suffisent pour passer à l'étape suivante. Vous pourrez toujours revenir pour compléter."*

Validation to advance: `name` and `category_id` must be non-empty.

#### Step 2 — Prix & Stock
Fields:
- **Prix de base** (required, integer XOF) — FCFA badge on input, placeholder: `ex: 125000`
- **Prix barré** (optional) — tooltip: *Ancien prix avant promotion. Affiché barré sur la fiche produit.*
- **Quantité en stock** (integer, default 0)
- **Seuil d'alerte stock faible** (integer, default 5) — tooltip: *Vous recevrez une alerte lorsque le stock passe sous ce seuil.*
- **Poids** (optional, grams) — tooltip: *Utilisé pour le calcul des frais de livraison.*

Validation to advance: `base_price` must be a non-negative integer.

#### Step 3 — Médias
Two sub-sections:
1. **Images** — existing `ImageManager` + `ImageUpload` components, unchanged
2. **Variantes** — existing `VariantList` + `VariantForm` components, unchanged

Contextual hint (amber): *"Au moins une image est recommandée avant publication."*

This step is entirely optional — no validation required to advance.

#### Step 4 — Finalisation
Fields:
- **Résumé court** (optional, single-line text) — placeholder: `ex: Smartphone 128Go avec triple caméra 50MP`
- **Description** (optional) — existing `RichTextEditor` component
- **Titre SEO** (optional, max 60 chars) — live character counter
- **Meta-description** (optional, max 160 chars) — live character counter, textarea
- **is_active** toggle — label: *Publier immédiatement*
- **is_featured** toggle — label: *Mettre en avant sur la page d'accueil*

Final button:
- If `is_active = 1` → **"Publier le produit"**
- If `is_active = 0` → **"Enregistrer comme brouillon"**

### Navigation

**Stepper bar** (top of wizard):
- Each step shows number, title, and subtitle (e.g. *Nom · Marque · Catégorie*)
- Completed steps: navy background, clickable
- Current step: navy background, active state
- Future steps: grey, not clickable
- Connector lines between steps (grey, filled navy as steps complete)

**Previous/Next buttons:**
- "Suivant →" advances to next step (after validating current step's required fields)
- "← Précédent" goes back (no validation required)
- First step has no "Précédent" button
- Last step replaces "Suivant" with the final publish/save button

**Auto-save:**
- Each "Suivant" click triggers `updateProduct(id, formData)` server action with the current step's fields
- "Brouillon sauvegardé automatiquement" shown in footer of each step
- If the server action fails, show an error toast (Sonner) and do not advance

### Technical Approach

**Preserved:** The draft-first flow is unchanged. Clicking "Nouveau produit" still calls `createDraftProduct()` and redirects to `/products/[id]/edit`.

**New:** The `ProductFormSections` component is replaced by a new `ProductWizard` client component. The wizard manages current step state locally (`useState`). Each step is a separate sub-component.

**Per-step save:** Each "Suivant" submits only the fields from the current step via `updateProduct`. The existing `productSchema` is reused with partial validation (only required fields for the current step are enforced client-side).

**Publishing:** "Terminer" calls `updateProduct` with `is_active` and `is_featured` values, which clears `is_draft = 0` (existing behavior). The redirect after publish goes to the products list with a success toast.

**Existing components reused as-is:**
- `CategoryCascadingSelect`
- `ImageManager` + `ImageUpload`
- `VariantList` + `VariantForm`
- `RichTextEditor`

### Guidance Elements (per field)

| Element | Purpose | Implementation |
|---------|---------|----------------|
| Placeholder | Show expected format/example | `placeholder` prop on input |
| Helper text | Short hint below field | Small grey `<p>` under input |
| Tooltip `?` | Explain non-obvious fields | Radix `Tooltip` component |
| Step hint | Minimum required to advance | Blue info box at bottom of step body |
| Character counter | Live feedback for SEO fields | Controlled input + `{n}/{max}` display |
| Auto-save indicator | Reduce anxiety about losing work | Footer text, updated after each save |

### Out of Scope

- AI-generated descriptions or SEO suggestions (deferred)
- Bulk product import (CSV, barcode)
- Product templates by category
- Mobile-optimized stepper (mobile gets stacked layout, same as today)
