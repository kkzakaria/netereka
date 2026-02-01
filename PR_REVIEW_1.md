# Revue PR #1 — Setup fondation du projet

**Branche:** `feat/foundation` → `main`
**Commits:** 2 (setup fondation + mise à jour du plan de dev)
**Fichiers modifiés:** 41 (+20 770 / -8 236, dont ~90% est le `package-lock.json`)

---

## Ce qui est bien fait

1. **Structure des dossiers** — Conforme à l'architecture documentée : `actions/`, `components/{storefront,admin,shared}`, `lib/{db,auth,cloudflare,storage,notifications}`, `stores/`, `hooks/`, `types/`.

2. **Schéma DB complet** (`db/migrations/0001_initial.sql`) — Bien structuré avec toutes les tables nécessaires (users, products, variants, orders, delivery_zones, promo_codes, reviews), les indexes pertinents, les contraintes CHECK et les FK avec ON DELETE CASCADE.

3. **Types TypeScript** — Les interfaces `types/product.ts`, `types/order.ts`, `types/user.ts` reflètent fidèlement le schéma SQL. Bon usage de `export type *` dans le barrel.

4. **Helpers utilitaires** — `formatPrice` avec `Intl.NumberFormat("fr-CI")` pour XOF, `formatDate`/`formatDateTime`, constantes centralisées (`SITE_NAME`, `ORDER_STATUSES`, `CURRENCY`).

5. **Configuration Cloudflare** — `wrangler.jsonc`, `env.d.ts`, `lib/cloudflare/context.ts` avec helpers `getDB/getKV/getR2` propres. `@cloudflare/workers-types` dans tsconfig.

6. **Layout propre** — Root layout en `lang="fr"`, `NuqsAdapter` intégré, metadata avec template. Storefront layout avec Header/Footer, Admin layout avec sidebar placeholder.

---

## Problèmes et suggestions

### Bugs / Risques

1. **Référence FK avant création de table** — Dans `0001_initial.sql`, la table `addresses` référence `delivery_zones(id)`, mais `delivery_zones` est définie plus bas. Avec `CREATE TABLE IF NOT EXISTS` et SQLite, ça passe si les FK ne sont pas activées au moment de la création, mais c'est fragile. **Recommandation :** déplacer `delivery_zones` avant `addresses`, ou activer `PRAGMA foreign_keys = ON` explicitement dans la migration.

2. **`new Date().getFullYear()` dans le Footer** — Ce code s'exécute au build time (Server Component) et sera mis en cache. Si le site est déployé fin décembre, l'année affichée pourrait être décalée jusqu'au prochain redéploiement. Mineur, mais à noter.

3. **`wrangler.jsonc` contient des IDs placeholder** (`LOCAL_DB_ID`, `LOCAL_KV_ID`) — Ça fonctionnera en local, mais le déploiement échouera. Il serait utile d'ajouter un commentaire ou une vérification.

### Qualité du code

4. **Fichiers placeholder vides** — 10+ fichiers ne contiennent qu'un commentaire `// to be implemented` ou `"use server"` seul (`actions/auth.ts`, `actions/cart.ts`, `components/admin/sidebar.tsx`, `hooks/use-cart.ts`, `lib/auth/password.ts`, `lib/auth/session.ts`, etc.). Ces fichiers ne servent à rien pour l'instant et ajoutent du bruit. **Recommandation :** les supprimer et les créer quand ils seront implémentés.

5. **`lib/db/index.ts` — Typage `unknown[]` pour les params** — Le type `unknown[]` pour les paramètres SQL est correct, mais `db.prepare(sql).bind(...params)` avec un spread d'un tableau vide peut poser problème sur certaines versions de D1. Vérifier le comportement avec `params = []`.

6. **Pas de `PRAGMA foreign_keys = ON`** — D1/SQLite ne les active pas par défaut. Sans ce pragma, toutes les contraintes FK dans le schéma sont décoratives.

### Architecture

7. **`app/page.tsx` supprimé mais `components/component-example.tsx` reste** — L'ancienne page référençait `ComponentExample`. Le composant n'est plus utilisé. Nettoyer ou supprimer.

8. **Pas de `loading.tsx` / `error.tsx` dans les route groups** — Le composant `Loading` existe dans `components/shared/` mais n'est pas utilisé comme convention Next.js (`app/(storefront)/loading.tsx`).

---

## Verdict

PR solide pour une fondation. Le schéma DB, les types et la configuration Cloudflare sont bien faits. Les principaux points à adresser avant merge :
- Activer `PRAGMA foreign_keys = ON` dans la migration
- Réordonner les tables pour éviter les références FK forward
- Supprimer les fichiers placeholder vides
