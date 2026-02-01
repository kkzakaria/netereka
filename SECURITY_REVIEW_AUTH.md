# Revue de sécurité — Authentication System (feat/auth)

## Revue initiale — 2026-02-01

12 issues identifiées. Voir historique git pour le détail.

---

## Revue des corrections — 2026-02-01

Commit: `d0db008 fix(auth): address 12 security review findings`

### Statut des 12 issues originales

| # | Issue | Statut | Notes |
|---|-------|--------|-------|
| 1 | OAuth sans `state` (CSRF) | ✅ Corrigé | Cookie httpOnly + TTL 10min + validation dans callback |
| 2 | Callback sans validation | ✅ Corrigé | State vérifié + check `!profile.email` |
| 3 | Apple JWT non vérifié | ✅ Corrigé | `jwtVerify` + JWKS Apple + validation issuer/audience |
| 4 | Turnstile bypass silencieux | ✅ Corrigé | `throw Error` en production, fallback dev seulement |
| 5 | Pas de rate limiting | ✅ Corrigé | KV-based, 5 tentatives / 15 min, reset on success |
| 6 | Mot de passe faible | ✅ Corrigé | Regex majuscule + chiffre + caractère spécial |
| 7 | Middleware cookie-only | ✅ Corrigé | `jwtVerify` dans le middleware |
| 8 | Sessions non révocables | ✅ Corrigé | Session ID en KV, vérifié dans `getSession()`, supprimé au logout |
| 9 | Forgot password stub | ✅ Corrigé | Server action + Turnstile + rate limiting + anti-énumération |
| 10 | Pas de vérification email | ⚠️ Partiel | `is_verified` toujours pas vérifié au login. Un utilisateur non vérifié peut se connecter. |
| 11 | Injection de colonnes | ✅ Corrigé | Whitelist `UPDATABLE_COLUMNS` avec `Set.has()` |
| 12 | Turnstile test key | ✅ Corrigé | Fallback à chaîne vide, hidden input sans clé |

### Nouveaux points identifiés

#### N1. `revokeAllSessions` inopérante (Important)
**Fichier:** `lib/auth/session.ts`

`revokeAllSessions()` stocke un timestamp `revoked_before:{userId}` dans KV, mais `getSession()` ne consulte jamais ce timestamp. La fonction n'a aucun effet.

**Correction:** Ajouter dans `getSession()` une vérification du timestamp de révocation par rapport au `iat` du JWT.

#### N2. Race condition dans le rate limiter (Mineur)
**Fichier:** `lib/auth/rate-limit.ts`

`checkRateLimit` et `recordAttempt` font deux opérations KV séparées (GET puis PUT). Sous charge, plusieurs requêtes concurrentes peuvent passer avant l'incrémentation. Acceptable pour un e-commerce, mais à noter.

#### N3. `process.env.JWT_SECRET` en Edge Runtime (Important)
**Fichier:** `middleware.ts`

Le middleware lit `process.env.JWT_SECRET`. Si la variable n'est pas disponible dans l'Edge Runtime Cloudflare (doit être déclarée dans wrangler vars), `hasValidSession` retourne toujours `false` et tous les utilisateurs authentifiés sont redirigés vers le login silencieusement.

**Correction:** Logger un warning ou utiliser `getCloudflareContext()` si disponible en middleware.

#### N4. Apple OAuth: `response_mode: "form_post"` vs handler GET (Bloquant)
**Fichier:** `lib/auth/oauth.ts` + `app/api/auth/oauth/[provider]/callback/route.ts`

Apple envoie le callback en POST (`response_mode: "form_post"`), mais le handler est un `export async function GET()`. Le `state` et le `code` arrivent dans le body POST, pas en query params. Apple Sign-In ne fonctionnera pas.

**Correction:** Ajouter un handler POST dans le callback route, ou changer `response_mode` en `"query"` (moins sécurisé).

---

### Résumé v2

| Criticité | # | Problème |
|-----------|---|----------|
| Bloquant  | N4 | Apple callback POST vs handler GET |
| Important | 10, N1, N3 | Email non vérifié, `revokeAllSessions` inopérante, JWT_SECRET en Edge |
| Mineur    | N2 | Race condition rate limiter |

**Recommandation:** Le point N4 empêche Apple Sign-In de fonctionner. Les points 10, N1 et N3 devraient être corrigés avant le merge.
