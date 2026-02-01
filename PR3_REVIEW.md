# Revue de la PR #3 — Migration vers Better Auth

## Résumé

Cette PR remplace le système d'authentification custom (JWT + KV sessions + bcrypt + Turnstile + OAuth manuel) par **Better Auth** (`better-auth` + `@daveyplate/better-auth-ui`). Changement significatif : **+2006 / -1552 lignes** (dont ~1790 en `package-lock.json`).

## Points positifs

1. **Simplification massive** — Suppression de ~600 lignes de code custom (session JWT, rate-limiting KV, OAuth manual pour 3 providers, password hashing, Turnstile, validations Zod, formulaires). Better Auth gère tout cela out-of-the-box.
2. **Migration SQL bien pensée** — Le fichier `0002_better_auth.sql` migre les données existantes de la table `users` vers le schéma Better Auth avec `INSERT OR IGNORE`.
3. **Middleware simplifié** — Passage de `async` avec `jwtVerify` à un simple `cookies.has()`, plus rapide en edge.
4. **Architecture propre** — `initAuth()` lazy singleton, `Providers` wrapper, catch-all route `[...all]`.

## Problèmes et préoccupations

### Sécurité (critique)

1. **Middleware : `cookies.has()` n'est pas une validation** (`middleware.ts:6-7`) — Le middleware vérifie juste la présence du cookie `better-auth.session_token`, pas sa validité. Un cookie expiré ou forgé passera la vérification. L'ancien code faisait un `jwtVerify`. Régression de sécurité pour les routes protégées (`/account`, `/checkout`).

2. **Turnstile supprimé sans remplacement** — Le captcha Cloudflare Turnstile protégeait contre le brute-force et les bots. Better Auth n'intègre pas de captcha nativement. Il faudrait un plugin ou une réintégration.

3. **Rate-limiting supprimé** — Le rate-limiting KV custom a été supprimé. Better Auth a un plugin `rateLimit` — il devrait être activé.

### Bugs potentiels

4. **Singleton `authInstance` problématique** (`lib/auth/index.ts:3-4`) — Le module-level `let authInstance` persiste entre les requêtes sur Cloudflare Workers (isolate reuse). Si les bindings D1 changent entre requêtes, l'instance conserve une référence stale. Mieux vaut ne pas cacher l'instance, ou utiliser un pattern basé sur le contexte de la requête.

5. **`requireAdmin` utilise un cast unsafe** (`lib/auth/guards.ts:12-13`) — `(session.user as Record<string, unknown>).role` est fragile. Utiliser le type générique de Better Auth ou définir un type `User` étendu.

6. **Auth paths pas à jour dans le middleware** (`middleware.ts:4`) — Les `AUTH_PATHS` sont `["/auth/sign-in", "/auth/sign-up"]` mais le catch-all `[...pathname]` couvre aussi `/auth/forgot-password`, `/auth/reset-password`, etc. Un utilisateur authentifié peut toujours accéder à ces pages.

### Architecture

7. **Pas de `requireGuest` sur les pages auth** — L'ancien code avait un `AuthLayout` avec `requireGuest()`. Le nouveau catch-all ne fait aucune vérification côté serveur (le middleware le fait partiellement, mais seulement pour 2 paths).

8. **`better-auth-ui` ajoute une dépendance tierce non officielle** — `@daveyplate/better-auth-ui` n'est pas une lib officielle Better Auth. Elle ajoute des composants UI génériques qui ne respectent probablement pas le design system NETEREKA (Navy Blue + Mint Green, oklch). Les formulaires custom supprimés étaient alignés avec le design system.

9. **Table `users` et `lib/db/users.ts` supprimés** — D'autres parties du code (futures ou existantes) pourraient dépendre de `getUserById`, `updateUser`, etc. La migration SQL crée la table `user` (Better Auth) mais ne supprime pas `users`. Clarifier si l'ancienne table doit être conservée ou dropped.

10. **Variables d'environnement orphelines** (`env.d.ts`) — `JWT_SECRET` et `TURNSTILE_SECRET_KEY` supprimés, `BETTER_AUTH_SECRET` ajouté. Mais `NEXT_PUBLIC_TURNSTILE_SITE_KEY` côté client est aussi orphelin.

### Mineurs

11. **`jose` et `bcryptjs` restent dans `package.json`** — Ces dépendances ne sont plus utilisées nulle part mais n'ont pas été retirées.
12. **Pas de metadata sur la page auth** — Les anciennes pages avaient `export const metadata` pour le titre. Le catch-all n'en a pas.

## Recommandations

- **Blocker** : Corriger le middleware pour valider réellement la session (via `auth.api.getSession` ou un JWT check), pas juste `cookies.has()`.
- **Blocker** : Réintégrer un rate-limiting (plugin Better Auth ou custom).
- **Important** : Évaluer si `better-auth-ui` convient au design system, ou re-créer des formulaires custom avec les hooks Better Auth (`authClient.signIn`, etc.).
- **Important** : Fixer le singleton `initAuth()` pour Workers.
- Nettoyer les dépendances orphelines (`jose`, `bcryptjs`).
- Ajouter les metadata pour les pages auth.
