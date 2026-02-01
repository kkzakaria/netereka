# Revue de sécurité — Authentication System (feat/auth)

Date: 2026-02-01

## CRITIQUE

### 1. OAuth: Pas de paramètre `state` (CSRF)
**Fichier:** `lib/auth/oauth.ts`

Les URLs OAuth (Google, Facebook, Apple) ne contiennent aucun paramètre `state`. Un attaquant peut forger une requête de callback et lier son propre compte OAuth au profil d'une victime.

**Correction:** Générer un `state` aléatoire, le stocker en cookie `httpOnly`, et le valider dans le callback.

### 2. OAuth callback: Pas de validation du paramètre `code`
**Fichier:** `app/api/auth/oauth/[provider]/callback/route.ts`

Le `code` est pris directement depuis `url.searchParams` sans validation. Sans `state`, on ne peut pas confirmer que ce callback provient d'une requête initiée par l'utilisateur.

### 3. Apple Sign-In: Décodage JWT sans vérification de signature
**Fichier:** `lib/auth/oauth.ts` — `getAppleUser()`

Le `id_token` d'Apple est décodé avec un simple `atob()` sans vérifier la signature JWT. Un attaquant pourrait forger un `id_token` arbitraire et usurper n'importe quel email.

**Correction:** Utiliser `jwtVerify` de `jose` avec les clés publiques Apple (JWKS).

### 4. Turnstile désactivé silencieusement en dev
**Fichier:** `lib/auth/turnstile.ts:5`

`if (!secret) return true;` signifie que si `TURNSTILE_SECRET_KEY` n'est pas configuré en production (erreur de déploiement), la protection anti-bot est entièrement désactivée sans alerte.

**Correction:** En production, lancer une erreur si le secret manque. Le fallback `return true` ne devrait exister qu'en `NODE_ENV === 'development'`.

---

## IMPORTANT

### 5. Pas de rate limiting
Aucune protection contre le brute-force sur le login. Un attaquant peut tester des millions de mots de passe. Turnstile atténue le problème mais ne le résout pas (bypass possible).

**Correction:** Implémenter un rate limiter par IP + email (Cloudflare KV ou Rate Limiting API).

### 6. Politique de mot de passe trop faible
**Fichier:** `lib/validations/auth.ts`

Le seul critère est `min(8)`. Pas d'exigence de complexité (majuscule, chiffre, caractère spécial). Des mots de passe comme `aaaaaaaa` sont acceptés.

### 7. Middleware vérifie seulement l'existence du cookie, pas sa validité
**Fichier:** `middleware.ts`

`request.cookies.has(SESSION_COOKIE)` vérifie simplement si le cookie existe. Un cookie expiré ou invalide passera la vérification du middleware.

**Correction:** Vérifier le JWT dans le middleware (attention aux limites d'Edge Runtime).

### 8. Session non révocable
**Fichier:** `lib/auth/session.ts`

Les sessions sont des JWT stateless. Si un compte est compromis, il n'y a aucun moyen d'invalider les sessions existantes avant leur expiration (7 jours).

**Correction:** Stocker les sessions dans KV avec un TTL, permettant la révocation.

---

## MINEUR

### 9. `forgot-password` est un stub client-side
**Fichier:** `components/storefront/auth/forgot-password-form.tsx`

Le formulaire fait un `setSubmitted(true)` côté client sans appeler le serveur. Aucun email n'est envoyé. Trompeur pour l'utilisateur.

### 10. Pas d'email de vérification à l'inscription
**Fichier:** `actions/auth.ts` — `register()`

L'utilisateur est connecté immédiatement après inscription sans vérification d'email. `is_verified` reste à `0` mais n'est jamais vérifié ensuite.

### 11. `updateUser` vulnérable à l'injection de colonnes
**Fichier:** `lib/db/users.ts` — `updateUser()`

Les noms de colonnes sont construits dynamiquement depuis les clés de l'objet `data`. Le typage TypeScript protège au compile-time, mais pas au runtime.

### 12. Turnstile fallback site key exposé
**Fichier:** `components/shared/turnstile.tsx`

Le test key `1x00000000000000000000AA` est hardcodé. Si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` n'est pas configuré en production, Turnstile fonctionnera en mode test (accepte tout).

---

## Résumé

| Criticité | # | Problème |
|-----------|---|----------|
| Critique  | 1-4 | OAuth sans `state`, Apple JWT non vérifié, Turnstile bypass |
| Important | 5-8 | Pas de rate limiting, mots de passe faibles, sessions non révocables |
| Mineur    | 9-12 | Stubs non fonctionnels, vérification email manquante |

**Recommandation:** Les points 1, 3 et 4 devraient bloquer le merge. Les flux OAuth sont exploitables en l'état.
