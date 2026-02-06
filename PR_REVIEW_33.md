# Revue de la PR #33 — fix: resolve dev environment blockers for local D1 + better-auth

## Résumé

Cette PR corrige 3 blocages de l'environnement de développement local :
1. Import dynamique `next/dynamic` avec `ssr: false` dans le layout admin (Server Component)
2. Schema Drizzle manquant dans l'adaptateur better-auth
3. Crash à la création de session D1 dû aux objets `Date` passés par better-auth

**Fichiers modifiés :** 3 | **+32 / -22**

---

## 1. `app/(admin)/layout.tsx` — Suppression de `next/dynamic`

**Verdict : Correct**

Le layout admin est un Server Component (async + `await requireAdmin()`). En Next.js App Router, `next/dynamic` avec `ssr: false` n'est pas autorisé dans les Server Components. L'import direct de `<Toaster>` est la bonne approche : le composant a déjà `"use client"` et sera correctement hydraté côté client.

Pas de remarque.

---

## 2. `lib/auth/index.ts` — Passage du schema à Drizzle + better-auth

**Verdict : Correct — conforme à la documentation officielle**

### Ce que dit la doc better-auth

La [documentation de l'adaptateur Drizzle](https://www.better-auth.com/docs/adapters/drizzle) recommande explicitement de passer le schema :

```ts
database: drizzleAdapter(db, {
  provider: "sqlite",
  schema: { ...schema },
})
```

Sans schema, better-auth peut lever `TypeError: undefined is not an object (evaluating 'e._.fullSchema')` ([Issue #1163](https://github.com/better-auth/better-auth/issues/1163)). Le schema permet à l'adaptateur de résoudre les tables `user`, `session`, `account` et `verification`.

### Note sur la duplication d'instance Drizzle

`lib/db/drizzle.ts` crée déjà une instance `drizzle(d1, { schema })`. La PR crée une seconde instance indépendante dans `initAuth()`. C'est acceptable car better-auth encapsule son propre `db`, mais un commentaire serait bienvenu.

### Option `usePlural` non applicable ici

La doc mentionne une option `usePlural: true` pour les tables au pluriel (users, sessions...). Le projet utilise les noms singuliers attendus par better-auth (`user`, `session`, `account`, `verification`), donc pas besoin de `usePlural`.

---

## 3. `lib/db/schema.ts` — Custom type `dateText`

**Verdict : Workaround nécessaire et conforme à l'API Drizzle `customType`**

### Le problème documenté : D1 + Date objects

C'est un **bug connu et activement signalé** dans l'écosystème better-auth + D1 :

- **[Issue #4805](https://github.com/better-auth/better-auth/issues/4805)** : better-auth passe des `Date` JS dans les bind parameters SQLite. D1 rejette avec `D1_TYPE_ERROR: Type 'object' not supported for value '...'`.
- **[AnswerOverflow](https://www.answeroverflow.com/m/1345782110945804499)** : L'auto-cleanup des verifications expirées échoue sur D1 car les clauses WHERE contiennent des `Date` objects.
- **[PR #1460](https://github.com/better-auth/better-auth)** : Un PR "Transform sqlite values in Drizzle adapter" a été soumis mais ne couvre pas tous les code paths (notamment les WHERE clauses de cleanup).

**Le cœur du problème** : better-auth crée des `Date` JS au runtime pour `createdAt`, `updatedAt`, `expiresAt`, et les passe directement au driver. Cloudflare D1 `bind()` n'accepte que les primitives (`string`, `number`, `null`).

### Validation de l'approche `customType`

L'API `customType` de Drizzle est [officiellement documentée](https://orm.drizzle.team/docs/custom-types) et disponible pour `sqlite-core` :

```ts
import { customType } from 'drizzle-orm/sqlite-core';

const dateText = customType<{ data: Date; driverData: string }>({
  dataType() { return "text"; },
  toDriver(value) { return value.toISOString(); },
  fromDriver(value) { return new Date(value); },
});
```

C'est l'approche recommandée car **Drizzle n'a pas de `text({ mode: 'date' })`** pour SQLite ([Issue #3154](https://github.com/drizzle-team/drizzle-orm/issues/3154) — feature request ouverte). Les seules options natives pour les dates SQLite sont :
- `integer({ mode: 'timestamp' })` — stocke en epoch, mais nécessiterait une migration TEXT → INTEGER
- `integer({ mode: 'timestamp_ms' })` — idem en millisecondes
- `text()` brut — pas de conversion automatique

### Pourquoi pas `integer({ mode: 'timestamp' })` ?

La CLI better-auth (`npx @better-auth/cli generate`) génère des colonnes `integer({ mode: 'timestamp' })` pour SQLite. **Cependant** :
1. Les colonnes existantes sont en `TEXT` avec `DEFAULT (datetime('now'))` — une migration serait nécessaire
2. `defaultNow()` est **déprécié** pour SQLite dans Drizzle ([Issue #4796](https://github.com/better-auth/better-auth/issues/4796))
3. `integer({ mode: 'timestamp' })` est incompatible avec `unixepoch()` comme défaut ([Drizzle Issue #2912](https://github.com/drizzle-team/drizzle-orm/issues/2912))
4. Même avec `integer`, better-auth bypass parfois le mapping Drizzle et passe des `Date` bruts

Le `customType` TEXT est donc **le bon choix pragmatique** pour le schéma existant.

### Points d'attention sur l'implémentation actuelle

1. **Typage à améliorer**
   Le code utilise `customType<{ data: string; driverData: string }>` mais `toDriver` fait un cast `(value as unknown as Date)`. La documentation Drizzle montre que `data` devrait refléter le type réel. L'implémentation idéale serait :

   ```ts
   const dateText = customType<{ data: string | Date; driverData: string }>({
     dataType() { return "text"; },
     toDriver(value) {
       if (value instanceof Date) return value.toISOString();
       return String(value);
     },
     fromDriver(value) {
       return String(value);
     },
   });
   ```

   Cela élimine le cast `as unknown` et reflète que better-auth peut passer soit un `Date` soit un `string`.

2. **`fromDriver` ne parse pas en Date**
   C'est un choix délibéré et acceptable : le code applicatif traite ces champs comme des strings (ISO format). Si un jour on veut des `Date` côté lecture, il suffira de changer `fromDriver` pour retourner `new Date(value)`.

3. **Couverture potentiellement incomplète**
   Selon les issues better-auth, le problème D1 + Date ne touche pas seulement les INSERT mais aussi les **WHERE clauses** (auto-cleanup des verifications expirées). Le `customType` corrige les INSERT/UPDATE via `toDriver`, mais si better-auth construit des raw queries avec des `Date` dans les comparaisons, ces cas pourraient ne pas être couverts. A surveiller en production.

---

## Suggestions (non bloquantes)

| # | Suggestion | Impact |
|---|---|---|
| 1 | Typer `data: string \| Date` au lieu de `data: string` dans `dateText` | Élimine le cast `as unknown`, meilleure safety TypeScript |
| 2 | Ajouter un commentaire dans `initAuth()` expliquant pourquoi on ne réutilise pas `getDrizzle()` | Clarté pour les futurs développeurs |
| 3 | Surveiller les logs D1 en production pour `D1_TYPE_ERROR` dans les WHERE clauses de cleanup | Le `customType` ne protège pas contre les raw queries de better-auth |

---

## Sources consultées

- [better-auth: Drizzle Adapter](https://www.better-auth.com/docs/adapters/drizzle) — schema passing recommandé
- [better-auth Issue #1163](https://github.com/better-auth/better-auth/issues/1163) — crash sans schema
- [better-auth Issue #4805](https://github.com/better-auth/better-auth/issues/4805) — D1_TYPE_ERROR avec Date objects
- [better-auth Issue #4796](https://github.com/better-auth/better-auth/issues/4796) — defaultNow() déprécié pour SQLite
- [Drizzle ORM: Custom Types](https://orm.drizzle.team/docs/custom-types) — API `customType` officielle
- [Drizzle ORM: SQLite Column Types](https://orm.drizzle.team/docs/column-types/sqlite) — pas de `text({ mode: 'date' })`
- [Drizzle Issue #3154](https://github.com/drizzle-team/drizzle-orm/issues/3154) — feature request text timestamp
- [Drizzle Issue #2912](https://github.com/drizzle-team/drizzle-orm/issues/2912) — integer timestamp incompatible avec unixepoch()
- [Drizzle ORM: Cloudflare D1](https://orm.drizzle.team/docs/connect-cloudflare-d1) — setup D1

---

## Conclusion

**Approve** — Les trois corrections sont nécessaires, bien ciblées, et conformes aux documentations officielles de better-auth et Drizzle ORM. Le `dateText` custom type est un workaround pragmatique pour un bug connu de l'écosystème (better-auth passe des Date JS à D1 qui ne les accepte pas). L'approche `customType` est l'API Drizzle officielle pour ce cas d'usage. Les suggestions ci-dessus sont des améliorations de robustesse, pas des blockers.
