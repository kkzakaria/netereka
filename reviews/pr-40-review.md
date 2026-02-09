# Review — PR #40: Visual Attribute Editor for Product Variants

**Branche:** `feat/attribute-editor` → `main`
**Fichiers modifiés:** 5 (437 ajouts, 12 suppressions)
**Dépendance ajoutée:** `react-colorful` (~2.5 KB gzip)

## Résumé

Cette PR remplace le champ JSON brut (`<Input>`) des attributs de variantes par un éditeur visuel riche. Les améliorations incluent :

- Sélecteur de couleur avec palettes prédéfinies + picker personnalisé (`react-colorful`)
- Chips prédéfinis pour Stockage et RAM
- Possibilité d'ajouter des attributs personnalisés (clé/valeur libre)
- Correction du dialog pour scroll sur petits écrans + largeur élargie

L'UX admin est nettement améliorée — les admins n'ont plus besoin de saisir du JSON manuellement.

---

## Points positifs

1. **Bonne ergonomie** — Le passage de JSON brut à des sélecteurs visuels réduit les erreurs de saisie et améliore l'expérience admin.
2. **Accessibilité** — `aria-label` sur tous les boutons, `<fieldset>`/`<legend>` pour grouper les attributs, touch targets de 32px+.
3. **État scoped au composant** — Le fix dans `156ef77` résout correctement le problème de `nextId` global en le ramenant dans le state du composant.
4. **Sérialisation propre** — `serializeAttributes()` filtre les paires vides et produit du JSON propre via `<input type="hidden">`.
5. **Dépendance légère** — `react-colorful` est un bon choix (petit, accessible, sans dépendances).

---

## Problèmes identifiés

### 1. CRITIQUE — Le code hex des couleurs personnalisées est perdu

**Fichier:** `components/admin/attribute-editor.tsx` — `ColorValueInput`

Quand un admin choisit une couleur personnalisée :
- Il utilise le `HexColorPicker` pour sélectionner un hex (ex: `#FF5733`)
- Il tape un nom dans l'input (ex: "Corail")
- La valeur stockée en DB sera `{"color": "Corail"}`
- **Le hex `#FF5733` n'est jamais persisté**

Sur le storefront, `variant-selector.tsx` affiche le nom texte, mais il n'y a aucun moyen de reconvertir "Corail" en `#FF5733`. Si un jour vous ajoutez des swatches colorées côté client, les couleurs personnalisées seront sans couleur visuelle.

**Suggestion :** Stocker la valeur sous forme `"Corail:#FF5733"` ou `{"name":"Corail","hex":"#FF5733"}`, puis parser côté storefront.

### 2. MOYEN — Le changement de `dialog.tsx` est global

**Fichier:** `components/ui/dialog.tsx`

La modification change `sm:max-w-sm` → `sm:max-w-lg` pour **tous** les dialogs de l'application. D'autres dialogs (confirmation de suppression, formulaires simples) seront maintenant inutilement larges.

**Suggestion :** Garder le dialog par défaut à `sm:max-w-sm` et passer une `className` spécifique dans `variant-form.tsx` :

```tsx
<DialogContent className="sm:max-w-lg">
```

L'ajout de `max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain` est en revanche pertinent comme défaut global.

### 3. MOYEN — Pas de validation JSON côté serveur

**Fichier:** `actions/admin/variants.ts`

Le schéma Zod accepte n'importe quelle string pour `attributes`:

```typescript
attributes: z.string().default("{}")
```

Même si le nouveau composant génère toujours du JSON valide, l'endpoint reste accessible directement. Un appel API avec du JSON invalide sera stocké en DB et causera un `JSON.parse` silencieusement échoué côté storefront.

**Suggestion :**

```typescript
attributes: z.string().default("{}").refine(
  (val) => { try { JSON.parse(val); return true; } catch { return false; } },
  "Les attributs doivent être un JSON valide"
)
```

### 4. BAS — Clés personnalisées dupliquées non détectées

Si un admin ajoute deux attributs personnalisés avec la même clé (ex: deux fois "taille"), `serializeAttributes()` écrit dans un objet JS — la seconde valeur écrase silencieusement la première.

**Suggestion :** Ajouter une vérification ou désactiver les clés déjà utilisées dans le champ custom input (comme c'est déjà fait pour les `PREDEFINED_ATTRIBUTES` via `usedKeys`).

### 5. BAS — Clé custom pouvant collisionner avec les clés prédéfinies

Un admin peut taper manuellement "color" dans le champ personnalisé, ce qui crée un doublon potentiel avec le sélecteur prédéfini. Le `usedKeys` check ne couvre pas ce cas.

---

## Suggestions mineures

- **`handleSwatchClick` / `handleCustomToggle`** dans `ColorValueInput` sont mémorisés avec `useCallback`, mais les callbacks parent (`updateValue`, `updateKey`, etc.) ne le sont pas. Pour une liste d'attributs courte c'est acceptable, mais si le formulaire grandit, envisager `useCallback` ou extraire un composant `AttributeRow`.

- **Bundle :** Vérifier que `react-colorful` est bien tree-shaked et ne charge pas de code inutile. L'import nommé `{ HexColorPicker }` devrait suffire.

---

## Verdict

**Approuvé avec réserves** — L'UX est solide et le code est bien structuré. Les points 1 (hex perdu) et 2 (dialog global) devraient idéalement être corrigés avant merge. Le point 3 (validation serveur) est recommandé mais pas bloquant.
