# Auto-génération Slug & SKU — Design Spec

**Date:** 2026-03-15
**Scope:** Formulaire de création/édition de produit (admin)

## Objectif

Masquer les champs `slug` et `sku` du formulaire admin. Ces valeurs sont générées automatiquement côté serveur, sans intervention de l'utilisateur.

## Comportement attendu

### Slug
- Généré automatiquement depuis le `name` du produit via `slugify()` (logique existante dans `lib/utils.ts`)
- La logique serveur existe déjà dans `createProduct` et `updateProduct` — elle génère le slug si le champ est vide
- Le champ `slug` est retiré du formulaire UI et rendu optionnel dans le schéma Zod

### SKU
- Généré automatiquement dans `createProduct` au format `NET-{nanoid(8).toUpperCase()}` — ex: `NET-A3X7K2PQ`
- Garanti unique grâce à nanoid (déjà utilisé dans le projet pour les IDs)
- `updateProduct` préserve le SKU existant sans le régénérer
- `createDraftProduct` : pas de changement (utilise déjà un slug temporaire `draft-{id}`)

## Fichiers modifiés

### `components/admin/product-form-sections.tsx`
- Retirer le champ `slug` de la section "Informations générales"
- Retirer le champ `sku` de la section "Informations générales"

### `actions/admin/products.ts`
- **`productSchema`** : passer `slug` de `z.string().min(1)` à `z.string().optional().default("")`
- **`createProduct`** : ajouter la génération du SKU `NET-${nanoid(8).toUpperCase()}` avant l'insertion
- **`updateProduct`** : aucun changement sur la logique SKU (préservation de l'existant)

## Non-changements

- Schéma DB inchangé : `slug` reste `unique().notNull()` (toujours fourni par le serveur), `sku` reste `unique()` nullable
- Aucune migration DB requise
- `createDraftProduct` inchangé
