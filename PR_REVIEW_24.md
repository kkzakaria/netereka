# Review PR #24 — Set up Drizzle ORM with Cloudflare D1 database schema

## Résumé

Cette PR ajoute Drizzle ORM au projet en créant un fichier de schéma (`lib/db/schema.ts`), une configuration Drizzle Kit (`drizzle.config.ts`), et les dépendances associées. L'objectif annoncé est de remplacer le workflow de migrations SQL manuelles par `drizzle-kit push`.

---

## Problèmes Critiques

### 1. `drizzle-kit push` n'est pas adapté pour la production

La description de la PR indique vouloir "remplacer les migrations SQL manuelles par `drizzle-kit push`". C'est problématique :

- `drizzle-kit push` est conçu pour le **prototypage rapide**, pas pour la production
- Pas d'historique de migrations (impossible de rollback)
- Risque de perte de données (suppression de colonnes sans avertissement)
- Incompatible avec un pipeline CI/CD fiable
- La documentation Drizzle elle-même recommande `drizzle-kit generate` + `drizzle-kit migrate` pour la production

**Recommandation** : Utiliser `drizzle-kit generate` pour générer des fichiers de migration SQL, puis les appliquer via `wrangler d1 migrations apply` ou `drizzle-kit migrate`.

### 2. Aucune intégration avec le code existant

Le schéma est défini mais **jamais utilisé** dans le code. Il manque :

- **Aucun client Drizzle instancié** — pas de `drizzle(d1Database)` nulle part
- **Aucune modification des query helpers** existants (`lib/db/index.ts`, `lib/db/products.ts`, `lib/db/orders.ts`, etc.)
- Le code existant continue d'utiliser des requêtes SQL brutes via `query<T>()`, `queryFirst<T>()`, `execute()`, `batch()`

Le schéma est actuellement du **dead code**. Sans plan d'intégration, cette PR ajoute de la complexité sans bénéfice immédiat.

### 3. Trois approches DB en parallèle

Le projet a maintenant :
1. **Raw D1 SQL** — utilisé partout actuellement (`lib/db/index.ts`)
2. **Kysely** — `kysely` + `kysely-d1` déjà dans `package.json` (installé mais peu/pas utilisé)
3. **Drizzle ORM** — ajouté par cette PR

Trois ORMs/query builders pour un seul projet crée de la confusion. Il faudrait décider d'**un seul** et retirer les autres.

---

## Problèmes Moyens

### 4. CHECK constraints manquants

Le schéma SQL original contient des CHECK constraints qui ne sont pas reproduits dans le schéma Drizzle :

```sql
-- Original SQL
rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5)
```

```typescript
// Drizzle schema — pas de validation
rating: integer("rating").notNull(),
```

Les `enum` Drizzle couvrent `status` et `discount_type`, mais `rating` n'a aucune validation au niveau DB.

### 5. Index redondants sur colonnes UNIQUE

SQLite crée automatiquement un index pour les colonnes `UNIQUE`. Ces index explicites sont donc redondants et gaspillent de l'espace :

- `idx_user_email` sur `user.email` (déjà `UNIQUE`)
- `idx_promo_codes_code` sur `promo_codes.code` (déjà `UNIQUE`)
- `idx_session_token` sur `session.token` (déjà `UNIQUE`)

### 6. Scripts de migration en conflit

La PR ajoute de nouveaux scripts sans retirer les anciens :

```json
"db:push": "npx drizzle-kit push",      // Nouveau
"db:generate": "npx drizzle-kit generate", // Nouveau
"db:studio": "npx drizzle-kit studio",     // Nouveau
"db:migrate": "npx wrangler d1 execute ...", // Existant
"db:seed": "npx wrangler d1 execute ...",    // Existant
```

Quelle approche utiliser ? Ce n'est pas clair pour un nouveau contributeur.

### 7. `process.exit(1)` dans drizzle.config.ts

```typescript
function getLocalD1Path(): string {
  if (!fs.existsSync(d1Dir)) {
    console.error("...");
    process.exit(1); // Brutal — empêche toute gestion d'erreur
  }
}
```

Préférer un `throw new Error(...)` qui peut être capturé proprement.

---

## Problèmes Mineurs

### 8. Self-reference `categories.parent_id`

```typescript
parent_id: text("parent_id").references((): ReturnType<typeof text> => categories.id),
```

Le workaround `ReturnType<typeof text>` fonctionne mais est fragile. Drizzle supporte nativement les self-references via un callback simple — vérifier la documentation pour la syntaxe recommandée.

### 9. `better-sqlite3` comme devDependency

`better-sqlite3` est un module natif Node.js qui nécessite une compilation C++. Cela peut poser problème dans certains environnements CI (Docker slim, etc.). C'est nécessaire pour `drizzle-kit` en local, mais à documenter.

### 10. `.gitignore` — `.wrangler/`

Bonne addition. Le répertoire `.wrangler/` contient l'état local D1 et ne doit pas être versionné.

---

## Points Positifs

- Le schéma Drizzle est **fidèle** au schéma SQL final (après toutes les migrations 0001→0006)
- Les FK references pointent correctement vers la table `user` (Better Auth) et non `users` (legacy)
- Les `ON DELETE CASCADE` sont correctement appliqués là où le schéma SQL les définit
- La configuration supporte local et remote D1
- `drizzle-kit studio` est un outil utile pour l'inspection de la DB

---

## Verdict

**Changements demandés (Request Changes)**

Cette PR pose les fondations de Drizzle ORM mais n'est pas prête à être mergée en l'état :

1. **Retirer la dépendance à `drizzle-kit push`** pour la gestion de schema — utiliser `generate` + `migrate` à la place
2. **Ajouter un client Drizzle** (`lib/db/drizzle.ts`) qui instancie `drizzle(d1)` avec le schéma
3. **Définir un plan de migration** : soit migrer progressivement les query helpers vers Drizzle, soit garder le raw SQL et utiliser Drizzle uniquement pour le schema management
4. **Retirer Kysely** du `package.json` si on passe à Drizzle (ou justifier la coexistence)
5. **Ajouter les CHECK constraints manquants** (rating)
6. **Retirer les index redondants** sur les colonnes UNIQUE
7. **Documenter l'approche** dans `CLAUDE.md` ou un README dédié
