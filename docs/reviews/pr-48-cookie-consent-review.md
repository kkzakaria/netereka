# Revue de la PR #48 — Cookie Consent Banner + GA4

## Résumé

Cette PR ajoute un bandeau de consentement cookies conforme à la loi ivoirienne (n°2013-450) avec intégration conditionnelle de Google Analytics 4. L'architecture est propre (Zustand persist, injection conditionnelle de GA4, séparation des composants).

**Branche :** `feat/cookie-consent` → `main`
**Commits :** 2 (feat + fix hydration)
**Fichiers modifiés :** 9 (+311 / -11)

---

## Points positifs

1. **Architecture bien pensée** — Le `consent-store` avec Zustand persist est le bon pattern, cohérent avec le `cart-store` existant.
2. **Consentement opt-in** — GA4 ne se charge que si `consent.analytics === true`, ce qui est conforme au RGPD/loi ivoirienne.
3. **Hydration SSR** — Le pattern `mounted` évite correctement les mismatches d'hydration.
4. **UX** — 3 options claires (Tout accepter, Tout refuser, Personnaliser) + lien footer pour modifier le choix.
5. **Page confidentialité mise à jour** — La section cookies documente les deux catégories.
6. **Design doc inclus** — `docs/plans/2026-02-13-cookie-consent-design.md` explique bien les choix.

---

## Problèmes à corriger

### 1. Erreurs ESLint bloquantes (2 erreurs) — BLOQUANT

La règle `react-hooks/set-state-in-effect` est violée dans deux fichiers :

- `components/analytics/google-analytics.tsx:13` — `useEffect(() => setMounted(true), []);`
- `components/storefront/cookie-banner.tsx:15` — `useEffect(() => setMounted(true), []);`

**Le pre-commit hook bloque les commits avec des erreurs lint.** Ce pattern `setMounted(true)` dans un effet synchrone déclenche un re-render inutile.

**Correction suggérée :** Utiliser `useSyncExternalStore` avec `getServerSnapshot` retournant `false` et `getSnapshot` retournant `true`, ou ajouter un `// eslint-disable-next-line react-hooks/set-state-in-effect` avec un commentaire expliquant pourquoi c'est intentionnel (pattern mounted bien connu pour le SSR).

### 2. Faille XSS potentielle dans Google Analytics — SÉCURITÉ

```tsx
// components/analytics/google-analytics.tsx:27
{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
```

La variable `GA_ID` (`process.env.NEXT_PUBLIC_GA4_ID`) est interpolée directement dans un `<Script>` inline. Si la variable d'environnement contient du contenu malicieux (peu probable mais possible en cas de compromission de l'env), c'est une injection de script.

**Correction suggérée :** Valider le format du GA_ID :

```tsx
const GA_ID = process.env.NEXT_PUBLIC_GA4_ID;
const GA_ID_SAFE = GA_ID && /^G-[A-Z0-9]+$/.test(GA_ID) ? GA_ID : null;
```

### 3. Google absent de la section "Partage des données" — LÉGAL

La page `politique-confidentialite` mentionne les cookies GA4 dans la section 8 mais la section 5 ("Partage des données") ne liste pas Google parmi les prestataires techniques. Si GA4 est activé, Google doit être mentionné aux côtés de Cloudflare et Resend pour rester conforme.

---

## Suggestions d'amélioration (non bloquantes)

### 4. `updateConsent` ignore le paramètre `category`

```typescript
// stores/consent-store.ts:23
updateConsent: (_category, value) =>
  set(() => ({
    consent: { analytics: value },
  })),
```

Le paramètre `category` est ignoré. Si d'autres catégories de cookies sont ajoutées (marketing, etc.), cette fonction écrasera tout. Un `TODO` serait bienvenu.

### 5. `CookieSettingsButton` — accès direct au store

```tsx
// components/storefront/cookie-settings-button.tsx:8
onClick={() => useConsentStore.setState({ consent: null })}
```

Appeler `setState` directement contourne l'API du store. Mieux vaut ajouter une action `resetConsent()` dans le consent-store pour la cohérence.

### 6. Le toggle custom devrait utiliser le composant Switch de shadcn/ui

Le toggle dans le panneau de paramètres (`cookie-banner.tsx:56-70`) est codé à la main avec des classes Tailwind. Le composant `Switch` de shadcn/ui (Radix) offrirait une meilleure accessibilité (focus management, keyboard navigation) et de la cohérence avec le design system.

### 7. `useConsentHydrated` est exporté mais jamais utilisé

Le hook `useConsentHydrated()` dans `stores/consent-store.ts:36-51` n'est importé nulle part dans la PR. Si c'est préventif pour un usage futur, un commentaire l'indiquant serait utile. Sinon, le supprimer pour éviter du code mort.

### 8. Changement au `cart-store.ts` non documenté

Le passage à optional chaining (`useCartStore.persist?.hasHydrated?.()`) dans `stores/cart-store.ts` est un fix défensif correct. Cependant, ce changement n'est pas mentionné dans le body du commit. Cela mériterait d'être documenté dans le message de commit pour la traçabilité.

### 9. Footer — budget JS client

`CookieSettingsButton` est un composant `"use client"` importé dans `Footer` (server component). C'est correct techniquement grâce à la boundary client/server de Next.js, mais cela ajoute du JS au bundle client. Acceptable mais à noter.

---

## Tableau récapitulatif

| # | Priorité | Action |
|---|----------|--------|
| 1 | 🔴 Bloquant | Corriger les erreurs ESLint `set-state-in-effect` |
| 2 | 🔴 Sécurité | Valider le format de `GA_ID` avant interpolation |
| 3 | 🟡 Légal | Ajouter Google à la section "Partage des données" |
| 4 | 🟢 Qualité | Ajouter un TODO pour `updateConsent` multi-catégories |
| 5 | 🟢 Qualité | Ajouter `resetConsent()` au store |
| 6 | 🟢 Qualité | Utiliser Switch de shadcn/ui |
| 7 | 🟢 Qualité | Supprimer ou commenter `useConsentHydrated` |
| 8 | 🟢 Qualité | Documenter le fix cart-store dans le commit |
| 9 | 🟢 Info | Budget JS du CookieSettingsButton dans le footer |
