# ProductCard — Refonte de la barre d'actions sur mobile

**Date** : 2026-04-16
**Statut** : Approuvé (brainstorming)
**Auteur** : Claude + @kkzakaria

## Contexte

Sur les viewports mobile (< 640px), la grille produits passe en 2 colonnes (`grid-cols-2 gap-3` dans `components/storefront/product-grid.tsx:14`). À 360px de largeur, chaque carte mesure ~158px. La barre d'actions actuelle (`components/storefront/product-card-actions.tsx`) place trois boutons sur une seule ligne :

```
[Ajouter (flex-1)] [WhatsApp icon-lg = 32px] [Wishlist icon-lg = 32px]
```

Le bouton principal a `whitespace-nowrap` + `shrink-0` hérités de `buttonVariants` ; combiné avec le label « Rupture de stock » (≈130px de besoin), les icônes WhatsApp et wishlist débordent hors de la carte.

Une première PR (kkzakaria/netereka#171) a tenté un fix minimal (`min-w-0` + `truncate` + label raccourci en « Épuisé »). Le débordement disparaît mais le label se retrouve tronqué visuellement, ce qui est inacceptable en pratique. Cette PR sera **fermée sans merger** au profit de la refonte décrite ici.

## Objectif

Éliminer le débordement **et** la troncature en repensant la disposition mobile, sans régression desktop ni sur la PDP.

## Décisions structurantes

| Dimension | Choix | Raison |
|---|---|---|
| Disposition mobile | Stack vertical : icônes en haut, CTA principal en bas | CTA principal en zone pouce, place pour le label complet |
| Périmètre responsive | Mobile uniquement (< sm/640px) | Le débordement n'existe pas au-delà ; pas de régression de densité desktop |
| Largeur des icônes mobile | `flex-1` (étalées) | Cibles tactiles plus généreuses, parallèle visuel avec le bouton dessous |
| Label en rupture de stock | « Rupture de stock » restauré | La place est là maintenant, plus besoin de raccourcir |
| Stratégie PR | Fermer #171, ouvrir une nouvelle PR avec la refonte complète | Évite de laisser le hack `truncate`/`min-w-0` dans le code |

## Disposition cible

### Mobile (< 640px)

```
┌──────────────────────────────────┐
│ [WhatsApp flex-1] [Wishlist flex-1]│  ← rangée d'icônes (top)
│ [   Ajouter au panier (full)    ] │  ← CTA principal full-width (bas)
└──────────────────────────────────┘
```

- Container : `flex-col` avec `gap-1.5`
- Rangée icônes : sub-flex, `gap-1.5`, chaque icône `flex-1` (largeur ~50% de la carte)
- Bouton principal : `w-full`, hauteur conservée (`size="lg"`)

### Tablette / Desktop (sm+)

Disposition actuelle **inchangée** :

```
┌────────────────────────────────────────────────┐
│ [Ajouter (flex-1)]  [WhatsApp 32px]  [♥ 32px] │
└────────────────────────────────────────────────┘
```

- Container : `flex-row items-center gap-2`
- Bouton principal en premier (gauche), icônes 32×32 en suite

### Mécanique CSS — sub-container `sm:contents`

Pour réordonner sans dupliquer le markup, on utilise :

```tsx
<div className="flex flex-col gap-1.5 border-t px-3 py-2 sm:flex-row sm:items-center sm:gap-2">
  <Button className="w-full order-last sm:order-none sm:flex-1">Ajouter</Button>
  <div className="flex gap-1.5 sm:contents">
    <WhatsAppButton className="flex-1 sm:flex-none" />
    <WishlistButton className="flex-1 sm:flex-none" />
  </div>
</div>
```

- **Mobile** : container vertical ; le sub-div icônes garde `flex gap-1.5` ; `order-last` pousse le bouton principal en bas malgré sa position en premier dans le JSX.
- **sm+** : container horizontal ; `sm:contents` fait disparaître le sub-div du layout (les icônes deviennent enfants directs du parent flex) ; `sm:flex-none` rétablit la largeur intrinsèque `icon-lg` ; ordre JSX = ordre visuel.

## Comportements préservés (no-op)

- Wishlist visible pour les guests, clic ouvre `AuthDialog`
- WhatsApp + wishlist restent fonctionnels en rupture de stock
- Bouton principal désactivé + variant `outline` en rupture
- Variant picker dialog s'ouvre au clic sur Ajouter quand `variant_count > 1`
- `WhatsAppProductButton variant="full"` (utilisé sur la PDP) inchangé
- `WishlistButtonDynamic` standalone (utilisé sur la PDP, lignes 267 et 294 de `app/(storefront)/p/[slug]/page.tsx`) inchangé — la prop `className` est opt-in

## Fichiers modifiés

| Fichier | Nature du changement |
|---|---|
| `components/storefront/product-card-actions.tsx` | Refonte du `<div>` actions : container responsive `flex-col sm:flex-row`, sub-div icônes `flex sm:contents`, ordering via `order-last sm:order-none`. Restaure « Rupture de stock » en label complet, retire `min-w-0` et `<span className="truncate">`. |
| `components/storefront/whatsapp-product-button.tsx` | Ajoute prop `className?: string` (variante `icon` uniquement) ; transmise au `<Button>` via `cn()`. |
| `components/storefront/wishlist-button-dynamic.tsx` | Ajoute prop `className?: string`. Forwarded vers le `<Button>` interne (état guest) **et** vers `<WishlistButton>` (état authentifié, qui a déjà cette prop). |

Aucun changement requis dans `components/storefront/wishlist-button.tsx` (la prop `className` existe déjà).

## Tests

Pas de tests existants sur `product-card-actions.tsx` (vérifié via `npm run test -- components/storefront` — aucun fichier matching). Le changement étant purement visuel/responsive, **pas de nouveau test unitaire** requis. La validation passe par :

- `npm run dev` + DevTools mobile (320, 360, 375, 768px)
- Pre-commit hook : `tsc --noEmit` + `eslint` + `vitest run` (suite existante 710 tests)
- Vérification manuelle PDP : icônes WhatsApp full + wishlist standalone inchangées

## Implications

- **+36px de hauteur** sur les cartes mobile (deux rangées d'actions au lieu d'une) → impact accepté sur la longueur de scroll des pages catalogue
- **Aucune régression desktop / tablette** : sm+ identique à l'existant
- **Aucune régression PDP** : les composants WhatsApp/wishlist gardent leurs styles par défaut
- **`min-w-0 + truncate + « Épuisé »` du fix #171 retirés** : la place est là, plus besoin du hack

## Stratégie PR

1. Fermer (sans merger) **kkzakaria/netereka#171** avec un commentaire pointant vers la nouvelle PR.
2. Repartir de `main` (pas de `fix/product-card-mobile-overflow` — le commit du hack est abandonné).
3. Nouvelle branche : `fix/product-card-mobile-actions-redesign`.
4. Commit unique scope `storefront` : `fix(storefront): redesign product card mobile actions to prevent overflow`.
5. PR avec test plan détaillé (320px, 360px, 375px, 768px ; rupture de stock ; guest vs authentifié ; PDP non régressée).

## Critères d'acceptation

- [ ] À 360px et 320px : les trois boutons tiennent dans la carte sans débordement
- [ ] À 360px et 320px : le label « Rupture de stock » s'affiche en entier sans troncature
- [ ] À 768px+ : disposition single-row identique à aujourd'hui
- [ ] PDP : icône WhatsApp full-width et wishlist standalone visuellement identiques à avant
- [ ] CTA principal en bas du stack mobile cliquable au pouce (pas de scroll forcé pour atteindre)
- [ ] Aucun warning d'hydratation
- [ ] Pre-commit hook OK (tsc + eslint + 710 tests)
