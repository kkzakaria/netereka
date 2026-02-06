# Review PR #35: fix: remove header/footer from auth pages

## Résumé

Cette PR déplace les pages d'authentification du route group `(storefront)` vers un nouveau route group `(auth)`, afin de supprimer le Header, Footer et CartDrawer des pages de connexion/inscription.

**Branche:** `fix/remove-appbar-from-auth-pages` -> `main`
**Commit:** `ce11fb4`
**Fichiers modifiés:** 10 (9 renames + 1 nouveau fichier)

---

## Changements

| Fichier | Type |
|---------|------|
| `app/(auth)/layout.tsx` | **Nouveau** - Layout pass-through pour le route group |
| `app/(auth)/auth/layout.tsx` | **Modifié** - `min-h-[calc(100dvh-8rem)]` -> `min-h-dvh` |
| `app/(auth)/auth/sign-in/{layout,page}.tsx` | Rename depuis `(storefront)` |
| `app/(auth)/auth/sign-up/{layout,page}.tsx` | Rename depuis `(storefront)` |
| `app/(auth)/auth/forgot-password/{layout,page}.tsx` | Rename depuis `(storefront)` |
| `app/(auth)/auth/reset-password/{layout,page}.tsx` | Rename depuis `(storefront)` |

---

## Verdict: APPROUVE avec suggestions mineures

La PR est propre, bien ciblée, et résout correctement le problème. L'approche par route group est la bonne façon de faire dans Next.js App Router.

---

## Points positifs

1. **Approche correcte** - Utiliser un route group séparé `(auth)` est la solution idiomatique en Next.js App Router pour isoler les layouts.

2. **Aucun lien cassé** - Les URLs publiques (`/auth/sign-in`, `/auth/sign-up`, etc.) restent identiques. Les route groups entre parenthèses n'affectent pas les URLs.

3. **Pas d'impact sur les API** - Les routes `/api/auth/[...all]` ne sont pas affectées.

4. **Pas d'impact sur le proxy** - `proxy.ts` utilise des chemins (`/auth/`), pas des route groups.

5. **Correction du `min-h` cohérente** - Passage de `min-h-[calc(100dvh-8rem)]` à `min-h-dvh` est correct puisque le header (4rem) et footer (4rem) ne sont plus présents.

6. **Guard `requireGuest()` conservé** - La protection contre l'accès authentifié est maintenue.

---

## Suggestions mineures (non-bloquantes)

### 1. `export const dynamic = "force-dynamic"` dupliqué

Le `dynamic = "force-dynamic"` est exporté dans **deux** layouts :
- `app/(auth)/layout.tsx` (ligne 1)
- `app/(auth)/auth/layout.tsx` (ligne 5)

Dans Next.js, `force-dynamic` dans un layout parent s'applique déjà à tous les segments enfants. L'export dans `app/(auth)/layout.tsx` suffit. Celui dans `app/(auth)/auth/layout.tsx` est redondant.

**Suggestion:** Retirer `export const dynamic = "force-dynamic"` de `app/(auth)/auth/layout.tsx`.

### 2. Le layout `app/(auth)/layout.tsx` est un simple pass-through

```tsx
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

Ce layout ne fait que passer les `children` à travers un fragment. La seule raison de son existence est le `export const dynamic`. Si Next.js applique `force-dynamic` au niveau du segment, ce fichier est nécessaire. Mais si les pages/layouts enfants gèrent déjà `dynamic` ou `requireGuest()` (qui est une opération dynamique), ce fichier pourrait être supprimé.

**Suggestion:** Vérifier si le layout est réellement nécessaire ou si `force-dynamic` dans le layout enfant `auth/layout.tsx` suffit. Si non, conserver tel quel.

### 3. Pas de Toaster sur les pages auth

Le storefront layout inclut un `CartDrawer` mais aucun `Toaster`. Les pages auth n'auront donc pas de Toaster non plus. Si les pages auth affichent des notifications (erreurs de connexion, succès d'envoi de mail, etc.) via un système de toast, elles ne fonctionneront pas.

**Suggestion:** Vérifier si les pages auth utilisent des toasts. Si oui, ajouter un `<Toaster />` dans le layout `(auth)`.

---

## Vérifications effectuées

- [x] Les URLs publiques ne changent pas (`/auth/sign-in`, `/auth/sign-up`, etc.)
- [x] Tous les `<Link href="/auth/...">` dans le codebase fonctionneront toujours
- [x] `lib/auth/guards.ts` redirige vers `/auth/sign-in` (chemin, pas route group)
- [x] `proxy.ts` utilise `/auth/` comme chemin (pas affecté)
- [x] `app/api/auth/[...all]/route.ts` non affecté
- [x] `next.config.ts` n'a pas de rewrites/redirects pour `/auth`
- [x] Les metadata `robots: noindex, nofollow` sont conservées
- [x] Le guard `requireGuest()` est conservé
- [x] Aucune dépendance sur des composants spécifiques au storefront dans les pages auth
