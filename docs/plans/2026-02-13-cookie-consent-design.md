# Design — Bandeau consentement cookies

## Contexte

NETEREKA utilise actuellement des cookies techniques (session better-auth, localStorage pour panier et theme). GA4 sera ajouté prochainement. La loi ivoirienne (n2013-450) exige un consentement prealable pour les cookies non essentiels.

## Categories

| Categorie | Cookies | Consentement |
|-----------|---------|-------------|
| Necessaires | Session better-auth, panier localStorage, theme | Toujours actif |
| Analytiques | GA4 (`_ga`, `_ga_*`) | Opt-in requis |

## Architecture

### Store consentement (`stores/consent-store.ts`)

Zustand + persist middleware, cle `netereka-consent:v1` dans localStorage.

- `consent: { analytics: boolean } | null` — null = pas encore choisi
- `acceptAll()`, `rejectAll()`, `updateConsent(category, value)`

### Bandeau (`components/storefront/cookie-banner.tsx`)

- Fixed bottom, affiche si `consent === null`
- 3 actions : Tout accepter (primaire), Tout refuser (secondaire), Personnaliser
- Panneau personnalisation avec toggles par categorie
- Lien vers `/politique-confidentialite`

### GA4 (`components/analytics/google-analytics.tsx`)

- Lit `consent.analytics` du store
- Si true : injecte gtag.js via `next/script` (afterInteractive)
- Measurement ID via `NEXT_PUBLIC_GA4_ID`

### Montage

Dans `components/providers.tsx` : `<CookieBanner />` + `<GoogleAnalytics />`.

## Fichiers impactes

- `stores/consent-store.ts` — nouveau
- `components/storefront/cookie-banner.tsx` — nouveau
- `components/analytics/google-analytics.tsx` — nouveau
- `components/providers.tsx` — modifie
- `app/(storefront)/politique-confidentialite/page.tsx` — modifie (section cookies)
