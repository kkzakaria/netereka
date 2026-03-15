# Auto-génération Slug & SKU — Design Spec

**Date:** 2026-03-15
**Scope:** Formulaire de création/édition de produit (admin)

## Objectif

Masquer les champs `slug` et `sku` du formulaire admin. Ces valeurs sont générées automatiquement côté serveur, sans intervention de l'utilisateur.

## Flux réel du formulaire

Le formulaire utilise exclusivement :
1. `createDraftProduct` — déclenché à l'ouverture de `/products/new`, crée une ligne draft avec `slug = draft-{id}`, `sku = null`, `is_draft = 1`
2. `updateProduct` — utilisé pour **tous** les enregistrements (création depuis draft et édition)

`createProduct` n'est jamais appelé depuis l'UI. Les changements se concentrent donc sur `updateProduct`.

## Comportement attendu

### Requête de récupération en début de `updateProduct`

```typescript
const existing = await queryFirst<{ slug: string; sku: string | null; is_draft: number }>(
  "SELECT slug, sku, is_draft FROM products WHERE id = ?",
  [id]
);
if (!existing) return { success: false, error: "Produit introuvable" };
```

### Slug

**Sentinelle :** `existing.is_draft === 1` indique un premier enregistrement.

**Si `existing.is_draft === 1` :**
1. `base = slugify(data.name)` (le bloc pré-parse lignes 97–99 doit être supprimé en prérequis)
2. Si `base` est vide : `{ success: false, error: "Le nom ne permet pas de générer un slug valide" }`
3. Boucle de déduplication :
   ```sql
   SELECT id FROM products WHERE slug = ? LIMIT 1
   ```
   Tester `base`, puis `base-2`, …, `base-100`. Ne pas ajouter `AND id != ?` — le slug draft actuel ne conflictera jamais avec `base`.
4. Si aucun slug libre après 100 tentatives : `{ success: false, error: "Impossible de générer un slug unique pour ce nom" }`
5. `finalSlug = slug trouvé`

**Si `existing.is_draft === 0` :** `finalSlug = existing.slug`. Note : un row avec `is_draft = 0` ne peut pas avoir un slug `draft-{id}` dans le flux normal — `is_draft` ne passe à `0` qu'au moment où un `finalSlug` définitif est écrit.

### SKU

**Condition :** `existing.sku === null`. Intentionnel pour les produits migrés sans SKU : la génération s'applique à tout produit `sku = null`, quel que soit `is_draft`. La coercion `data.sku || null` existante garantit qu'aucune ligne ne contient `sku = ""`.

**Si `existing.sku === null` :**
```typescript
let finalSku = "";
let skuWritten = false;
for (let attempt = 0; attempt < 3; attempt++) {
  finalSku = `NET-${nanoid(8).toUpperCase()}`;
  try {
    await execute("UPDATE products SET ..., sku = ?, ... WHERE id = ?", [..., finalSku, id]);
    skuWritten = true;
    break; // succès
  } catch (err) {
    if (!(err as Error).message.includes("UNIQUE constraint failed")) throw err;
    // collision SKU : régénérer et réessayer
  }
}
if (!skuWritten) return { success: false, error: "Impossible de générer un SKU unique, veuillez réessayer" };
```

**Si `existing.sku !== null` :** `finalSku = existing.sku`. L'UPDATE est exécuté normalement (sans try/catch pour SKU).

### Race condition sur le slug

Si l'UPDATE lève une exception dont le `.message` contient `"UNIQUE constraint failed: products.slug"`, retourner `{ success: false, error: "Conflit de slug, veuillez réessayer" }`. Re-lancer toute autre exception.

### Revalidation sur première publication

Après le succès de l'UPDATE, si `existing.is_draft === 1` (transition draft→publié) :
- Conserver les `revalidatePath` existants (`/products`, `/products/${id}/edit`, etc.)
- Ajouter `revalidatePath("/p/" + finalSlug)` pour exposer la page produit fraîche

### Règle absolue sur le UPDATE

`finalSlug` et `finalSku` **remplacent entièrement** `data.slug` et `data.sku || null` dans les paramètres SQL. `data.slug` (`""` après Zod) ne doit jamais apparaître dans l'UPDATE.

## Affichage du SKU en mode édition

Remplacer le `<Input name="sku">` par un affichage en lecture seule : badge ou texte grisé montrant `product.sku`. Les produits en draft affichent rien.

## Fichiers modifiés

### `components/admin/product-form-sections.tsx`
- Retirer le champ `slug` (input + label)
- Remplacer le champ `sku` (input) par un affichage en lecture seule

### `actions/admin/products.ts`

**`productSchema` — remplacer la ligne `slug` par :**
```typescript
slug: z.string().optional().default(""),
```
(supprimer le `min(1)` existant — prérequis de la nouvelle logique)

**`updateProduct` — blocs à supprimer :**
- Lignes 97–99 : bloc pré-parse de génération de slug (**supprimer en premier**)
- Lignes 110–116 : bloc de vérification de slug dupliqué (rendu obsolète)

**`updateProduct` — logique à ajouter :**
1. Requête `queryFirst` en début de fonction (`slug`, `sku`, `is_draft`)
2. Construction de `finalSlug` avec boucle de déduplication si `is_draft === 1`
3. Construction de `finalSku` : si `existing.sku === null`, boucle try/catch autour de l'UPDATE complet (max 3) ; sinon réutiliser directement
4. `revalidatePath("/p/" + finalSlug)` si `existing.is_draft === 1` (en plus des revalidations existantes)
5. `finalSlug` et `finalSku` dans le UPDATE (jamais `data.slug` ni `data.sku`)

**`createProduct` :** aucun changement
**`createDraftProduct` :** aucun changement

## Non-changements

- Schéma DB inchangé : `slug` reste `unique().notNull()`, `sku` reste `unique()` nullable
- Aucune migration DB requise
