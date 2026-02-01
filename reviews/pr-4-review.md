# Revue de PR #4 : `feat: pages d'authentification custom (retrait better-auth-ui)`

**Branche :** `feat/custom-auth-pages` → `main`
**Changements :** +737 / −1,571 (15 fichiers)

## Points positifs

1. **Suppression de `@daveyplate/better-auth-ui`** et ses 103 dépendances transitives — excellente décision, réduit considérablement la surface d'attaque et la taille du bundle.
2. **Bonne décomposition en composants** : `AuthCard`, `PasswordInput`, `SocialLoginButtons`, `TurnstileCaptcha` — réutilisables et bien scopés.
3. **Layout centralisé** dans `auth/layout.tsx` au lieu de le répéter dans chaque page.
4. **Messages d'erreur localisés en français** avec mapping de codes d'erreur (`errorMessages`).
5. **Accessibilité** : `sr-only` sur les boutons sociaux et le toggle mot de passe, `Label` associés aux inputs.
6. **Le champ phone passe à `required: true`** côté backend — cohérent avec le formulaire d'inscription.

## Problèmes à corriger

1. **`TurnstileCaptcha` est créé mais jamais utilisé.** Aucune des 4 pages ne l'intègre. Le captcha Turnstile était actif via `AuthUIProvider` avant — c'est une **régression de sécurité**. Il faut l'intégrer au minimum sur `sign-up` et `forgot-password`.

2. **`Providers` est devenu un composant vide** (`<>{children}</>`) — il devrait être soit supprimé, soit le fichier nettoyé avec un commentaire sur le futur usage. En l'état, `"use client"` a été retiré mais le composant reste un wrapper inutile.

3. **Pas de validation côté client du téléphone.** Le champ est `type="tel"` avec `required` mais aucun `pattern` ou validation du format ivoirien (`+225 XX XX XX XX XX`). Un utilisateur peut soumettre n'importe quoi.

4. **`reset-password/page.tsx` : pas de `Suspense` autour de `useSearchParams()`.** Next.js 16 requiert que les composants utilisant `useSearchParams()` soient wrappés dans `<Suspense>` pour éviter un bail-out du SSR.

5. **`PasswordInput` : concaténation de className au lieu d'utiliser `cn()`.** Ligne `password-input.tsx:20` — devrait utiliser `cn("pr-10 h-9", props.className)` pour gérer correctement les conflits Tailwind.

6. **`TurnstileCaptcha` : `useEffect` sans tableau de dépendances.** `turnstile-captcha.tsx:44` — s'exécute à chaque render. Devrait être `useEffect(() => { renderWidget(); }, [])`.

7. **`force-dynamic` sur le layout auth** (`layout.tsx:3`) — probablement superflu si `requireGuest()` utilise les headers/cookies.

## Suggestions mineures

- **sign-in/sign-up** : `setLoading(false)` jamais appelé en cas de succès. Un `finally` serait plus propre.
- Les SVG inline dans `social-login-buttons.tsx` pourraient être extraits.
- Pas de `metadata` export sur les nouvelles pages (régression par rapport à l'ancien `generateMetadata`).

## Verdict

**Changements demandés.** Le retrait du captcha Turnstile est une régression de sécurité qui doit être corrigée avant merge.
