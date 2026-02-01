# Revue de la PR #3 — Migration vers Better Auth

## Résumé

Cette PR remplace le système d'authentification custom (JWT + KV sessions + bcrypt + Turnstile + OAuth manuel) par **Better Auth** (`better-auth` + `@daveyplate/better-auth-ui`). Changement significatif : **+2006 / -1552 lignes** (dont ~1790 en `package-lock.json`).

---

## Revue initiale — Points corrigés dans `623b0a6`

Les 11 points suivants de la première revue ont été traités :

1. ~~Middleware `cookies.has()` non sécurisé~~ → validation via `auth.api.getSession()`
2. ~~Turnstile supprimé~~ → noté comme TODO (voir point R5 ci-dessous)
3. ~~Rate-limiting absent~~ → plugin Better Auth activé
4. ~~Singleton `initAuth()` stale sur Workers~~ → nouvelle instance par requête
5. ~~Cast unsafe `Record<string, unknown>`~~ → types `Auth`/`Session` exportés + `inferAdditionalFields`
6. ~~Auth paths incomplets dans middleware~~ → couvre tout `/auth/*`
7. ~~`requireGuest` absent~~ → ajouté dans `guards.ts`
8. **`better-auth-ui` et design system** → Les variables CSS shadcn/ui sont en place, rendu à valider visuellement. Risque faible.
9. ~~Table `users` / `lib/db/users.ts`~~ → clarifié
10. ~~Variables d'environnement orphelines~~ → nettoyées
11. ~~Dépendances orphelines `jose`, `bcryptjs`~~ → retirées
12. ~~Metadata pages auth~~ → `generateMetadata` ajouté

---

## Seconde revue — Nouveaux problèmes (`623b0a6`)

### Bugs (bloquants)

#### R1. `import { headers } from "next/headers"` dans le middleware

**`middleware.ts:3`** — Le middleware Next.js ne supporte pas `next/headers`. Cette API n'est disponible que dans les Server Components et Server Actions. Le middleware reçoit la requête via son paramètre `request: NextRequest`.

**Correction :**
```ts
// Supprimer: import { headers } from "next/headers";
// Remplacer:
const session = await auth.api.getSession({
  headers: request.headers,  // utiliser les headers de la NextRequest
});
```

Ceci va provoquer une **erreur runtime** sur toute requête matchant le middleware.

#### R2. `runtime: "nodejs"` dans la config middleware

**`middleware.ts:37`** — `export const config = { runtime: "nodejs" }` n'est pas supporté pour le middleware Next.js, qui s'exécute toujours en edge runtime. Sur Cloudflare Workers, cette option sera soit ignorée soit provoquera une erreur au build. À supprimer.

#### R3. Typo dans le path de rate-limit

**`lib/auth/index.ts`** — La règle est `"/forget-password"` mais l'endpoint Better Auth est `"/forgot-password"`. Cette typo rend le rate-limiting sur la réinitialisation de mot de passe **inopérant**.

### Suggestions (non bloquants)

#### R4. Optimisation performance middleware

Le middleware instancie `betterAuth(...)` et appelle `getSession()` pour chaque requête matchée. Pour les routes protégées sans cookie, un fast-path éviterait ce coût :

```ts
if (isProtectedPath && !request.cookies.has("better-auth.session_token")) {
  return NextResponse.redirect(new URL("/auth/sign-in", request.url));
}
// Seulement alors: const auth = await initAuth(); ...
```

#### R5. Turnstile / captcha toujours absent

Le rate-limiting est en place mais aucun captcha n'a été réintégré. Les bots sophistiqués peuvent contourner le rate-limiting seul. À traiter dans un PR séparé.

#### R6. `requireGuest()` est du dead code

`requireGuest()` est défini dans `guards.ts` mais n'est appelé nulle part. Le middleware couvre ce cas, donc c'est de la défense en double — acceptable mais à noter.

---

## Statut

**3 points bloquants (R1, R2, R3)** à corriger avant merge. R1 et R2 cassent le middleware. R3 rend le rate-limit forgot-password inefficace.
