# Spec — Serveur MCP d'administration (phase 1 : brouillons produits)

**Date :** 2026-09-02
**Statut :** Implémenté (2026-09-02)
**Périmètre :** Phase 1 — création et édition de brouillons produits par une IA externe

---

## Objectif

Exposer l'administration de NETEREKA à une IA externe via le protocole MCP (Model Context Protocol), pour que la recherche et la rédaction d'une fiche produit soient faites par le client IA (Claude Desktop, claude.ai, Claude Code, ChatGPT, Cursor, agent maison…) et non plus par le pipeline Anthropic embarqué dans l'application (`/products/ai-new`).

Le MCP est **généraliste** : serveur distant, transport standard, authentification standard. N'importe quel client conforme peut s'y connecter.

## Décisions prises

1. **Client cible** : tous (claude.ai, Claude Desktop, Claude Code, ChatGPT, Cursor…). Conséquences : transport Streamable HTTP, authentification OAuth 2.1 avec enregistrement dynamique des clients. Un simple bearer token est exclu : les connecteurs claude.ai et ChatGPT ne permettent pas d'ajouter un en-tête manuel.
2. **Fonctionnalité IA existante** : conservée telle quelle (`/products/ai-new`, clés Anthropic/Brave, page AI settings). Son retrait est un chantier séparé, après validation du MCP en usage réel.
3. **Niveau de confiance** : brouillon complet uniquement (fiche, attributs, story, SEO, images, prix, stock, SKU, variantes). La publication (`is_draft = 0`) reste un geste humain dans le wizard admin.
4. **Hébergement** : route dans l'application Next.js (`app/api/mcp/`), pas de Worker séparé ni de serveur stdio local. Motifs : réutilisation directe de tout le code métier (`getDrizzle`, validations Zod, `fetchAndUploadImage`, `sanitizeDescriptionHtml`, `slugify`), déploiement par le pipeline canary existant, fournisseur OAuth (better-auth) et audit-log dans le même processus.

## 1. Architecture

### Flux d'un appel d'outil

```
Client MCP ──POST /api/mcp (Authorization: Bearer)──▶ withMcpAuth (better-auth)
   ▶ buildMcpContext : lecture fraîche de l'utilisateur en D1, rôle admin|super_admin, non banni
   ▶ McpServer (SDK officiel, instance par requête, mode stateless)
   ▶ handler d'outil ──▶ lib/db/product-drafts.ts (Drizzle) ──▶ D1 / R2
   ▶ audit_log (details.via = "mcp")
```

Mode stateless : un `McpServer` et un transport sont créés par requête, sans identifiant de session MCP. Rien à stocker entre deux requêtes, donc compatible avec plusieurs isolates Workers sans affinité.

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `app/api/mcp/route.ts` | `POST` = `withMcpAuth(auth, …)` puis transport Streamable HTTP « web standard » du SDK. `GET` et `DELETE` répondent 405. |
| `app/.well-known/oauth-authorization-server/route.ts` | `oAuthDiscoveryMetadata(auth)` — exposé à la racine car certains clients cherchent là plutôt que sous `/api/auth`. |
| `app/.well-known/oauth-protected-resource/route.ts` | `oAuthProtectedResourceMetadata(auth)`. |
| `lib/mcp/server.ts` | Construit le `McpServer`, enregistre les outils depuis le registre. |
| `lib/mcp/context.ts` | `McpContext { user: { id, name, role }, clientId, clientName }` et `assertAdminContext()`. |
| `lib/mcp/result.ts` | Helpers `ok(data)` / `fail(code, message, fieldErrors?)` — format de réponse uniforme. |
| `lib/mcp/tools/categories.ts` | `list_categories`. |
| `lib/mcp/tools/products.ts` | Outils produits (section 4). |
| `lib/validations/mcp-product.ts` | Schémas Zod d'entrée des outils, composés à partir de `product-story.ts` et `product-ai.ts`. Aucune règle métier dupliquée. |
| `lib/db/product-drafts.ts` | Module Drizzle portant toute la logique brouillon : création, mise à jour partielle, slug unique, images, variantes, suppression. Chaque `UPDATE`/`DELETE` porte `is_draft = 1` dans son `WHERE`. |
| `lib/db/audit.ts` | `recordAudit()` en Drizzle. |
| `app/(admin-auth)/admin/mcp/consent/page.tsx` | Page de consentement OAuth (section 2). |

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `lib/auth/index.ts` | Ajout du plugin `mcp` de better-auth + hook `before` sur `/mcp/authorize` (force `prompt=consent`). |
| `lib/db/schema.ts` | Trois tables OAuth (section 3). |
| `lib/db/types.ts` + `lib/constants/audit.ts` | Trois actions d'audit `product.draft_created`, `product.draft_updated`, `product.draft_deleted` et leurs libellés. |
| `app/(admin-auth)/admin/login/page.tsx` | Reprise du flux OAuth après connexion (section 2). |
| `package.json` | `@modelcontextprotocol/sdk` ^1.30 (compatible zod 4). |

Non modifiés, seulement réutilisés : `actions/admin/products-ai.ts`, le wizard, `lib/ai/image-fetch.ts`, `lib/utils/sanitize-html.ts`, `lib/utils` (`slugify`), `lib/db/categories.ts`, `lib/auth/ban.ts`, `lib/storage/images.ts`.

`env.d.ts` et `wrangler.jsonc` ne changent pas : `SITE_URL` (déjà `baseURL` de better-auth) sert de base OAuth.

## 2. Authentification OAuth 2.1

### Flux standard (géré par le plugin `mcp` de better-auth 1.6.25)

1. Le client appelle `POST /api/mcp` sans jeton → 401 + `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource"`.
2. Il lit les métadonnées, s'enregistre dynamiquement (`POST /api/auth/mcp/register`), ouvre `GET /api/auth/mcp/authorize` avec PKCE S256 dans le navigateur de l'admin.
3. Sans session : le plugin redirige vers `/admin/login` avec les paramètres OAuth conservés. L'admin se connecte (email + mot de passe + Turnstile, inchangé).
4. Consentement (voir ci-dessous) → code d'autorisation → `POST /api/auth/mcp/token` → jeton d'accès (1 h) + jeton de rafraîchissement (7 jours). Valeurs par défaut du plugin, non modifiées.
5. Chaque appel MCP : `withMcpAuth` valide le jeton contre `oauthAccessToken` et fournit `{ userId, clientId, scopes }`.

Configuration du plugin : `mcp({ loginPage: "/admin/login", resource: "<SITE_URL>/api/mcp", oidcConfig: { consentPage: "/admin/mcp/consent" } })`.

### Consentement obligatoire (point de sécurité)

En 1.6.25, `authorizeMCPOAuth` émet le code **sans écran de consentement** dès que l'admin a une session, sauf si la requête porte `prompt=consent`. L'enregistrement dynamique étant ouvert (obligatoire pour claude.ai et ChatGPT), un site malveillant pourrait enregistrer un client avec sa propre URL de redirection, faire cliquer un admin connecté sur l'URL d'autorisation, et récupérer un jeton admin. PKCE ne protège pas contre ce scénario, l'attaquant contrôlant le challenge.

Mitigation :

- Un hook `before` sur `/mcp/authorize` force `prompt=consent` sur toute requête, quelle que soit la valeur envoyée par le client.
- `oidcConfig.consentPage = "/admin/mcp/consent"`. La page lit `client_id` et `scope` dans ses paramètres, charge le nom du client dans `oauthApplication` (nom fourni par le client, donc affiché échappé), et propose « Autoriser » / « Refuser ». Elle appelle l'endpoint de consentement du plugin (`/api/auth/oauth2/consent`, cookie signé `oidc_consent_prompt`), qui redirige vers le client avec le code et le `state`.
- Résultat : aucun jeton n'est émis sans un clic humain explicite sur une page du domaine.

La page de consentement vit dans `(admin-auth)` (layout sans sidebar) et exige une session : sans session elle redirige vers `/admin/login` en conservant ses paramètres.

### Autorisation métier

Un compte `customer` peut techniquement terminer le flux OAuth. La frontière de sécurité est `assertAdminContext()`, appelée dans `app/api/mcp/route.ts` avant toute instanciation du serveur MCP :

- lecture fraîche de l'utilisateur en D1 à partir de `session.userId` (pas de cache cookie, même principe que `requireAdmin()`) ;
- rôle `admin` ou `super_admin` ;
- ban vérifié via `isActivelyBanned` ;
- sinon réponse JSON-RPC 403, l'outil n'est jamais exécuté.

Amélioration possible plus tard : refuser dès la page de consentement quand le rôle n'est pas admin.

### Reprise après login

La page `/admin/login` détecte `client_id` + `redirect_uri` dans ses paramètres de requête. Après connexion réussie, elle effectue une navigation complète (`window.location.assign`, pas `router.push`) vers `/api/auth/mcp/authorize?<mêmes paramètres>` au lieu de `/dashboard`. Le chemin de destination est codé en dur (même origine).

Le plugin possède aussi son propre mécanisme de reprise (cookie signé `oidc_login_prompt` + hook `after` sur la connexion). Les deux sont compatibles : les codes sont à usage unique et expirent en 10 min. Le comportement exact du hook `after` sur un appel `fetch` de connexion (réponse 302 suivie par le navigateur) est à valider de bout en bout avec Claude Code comme premier client ; si le hook du plugin suffit, la modification de la page de login peut se réduire à ne pas rediriger vers `/dashboard`.

### Rate limiting

Les endpoints OAuth vivent sous `/api/auth/*` et héritent du rate limiting better-auth existant (30 req/min). `/api/mcp` n'a pas de rate limiting propre en phase 1 : chaque requête est liée à un jeton, lui-même lié à un compte admin.

## 3. Données

Trois tables ajoutées dans `lib/db/schema.ts`, colonnes conformes au schéma attendu par le plugin (noms camelCase, comme les tables better-auth `user`/`session`/`account`). Les clés étrangères pointent sur `user`, pas `users`.

```
oauthApplication
  id, name, icon?, metadata?, clientId (unique), clientSecret?, redirectUrls,
  type, disabled (default false), userId? → user.id (cascade), createdAt, updatedAt

oauthAccessToken
  id, accessToken (unique), refreshToken (unique), accessTokenExpiresAt,
  refreshTokenExpiresAt, clientId → oauthApplication.clientId (cascade),
  userId? → user.id (cascade), scopes, createdAt, updatedAt

oauthConsent
  id, clientId → oauthApplication.clientId (cascade), userId → user.id (cascade),
  scopes, consentGiven, createdAt, updatedAt
```

Index sur `oauthApplication.userId`, `oauthAccessToken.clientId`, `oauthAccessToken.userId`, `oauthConsent.clientId`, `oauthConsent.userId`.

Migration générée par `npm run db:generate`. Purement additive, donc conforme à expand/contract, aucun marqueur d'acquittement nécessaire.

Aucun changement sur `products`, `product_images`, `product_variants`, `product_attributes`, `audit_log`.

## 4. Contrat des outils

Format commun :

- Entrée validée par Zod via `inputSchema` ; le SDK renvoie une erreur JSON-RPC `-32602` si le schéma n'est pas respecté.
- Sortie : `content: [{ type: "text", text: <JSON> }]`.
- Erreur métier : `isError: true`, contenu `{ code, message, fieldErrors? }` (section 5).
- Toutes les identités sont les `id` nanoid existants.

### Lecture

| Outil | Entrée | Sortie |
|---|---|---|
| `list_categories` | aucune | arbre `[{ id, name, slug, children[] }]` (2 niveaux max) |
| `search_products` | `query` (3–100 car.), `limit` (1–50, défaut 20) | `[{ id, name, slug, brand, sku, base_price, is_draft, is_active }]`. Recherche sur nom, slug, SKU ; brouillons et publiés inclus : c'est l'outil anti-doublon. |
| `get_product_draft` | `id` | fiche complète : champs produit, `attributes[]`, `images[]` (avec URL publique), `variants[]` |

### Écriture

Toutes refusent une cible qui n'est pas un brouillon (`not_found`).

**`create_product_draft`** → `{ id, slug, edit_url }`

- Obligatoires : `name` (1–150), `category_id` (doit exister).
- Optionnels : `brand` (≤80), `short_description` (≤120), `description_html` (passé par `sanitizeDescriptionHtml`, stocké avec `description_type = "html"`), `story { tagline, highlights[3–6], feature_blocks[2–4], faq[≤5] }`, `seo { meta_title ≤60, meta_description ≤160 }`, `attributes { colors[≤12], dimensions { length_mm, height_mm, width_mm, weight_g }, specs[≤20] }`, `pricing { base_price, compare_price, sku, stock_quantity, low_stock_threshold, weight_grams }`.
- Les schémas `story` et `attributes` sont ceux de `lib/validations/product-story.ts` et `lib/validations/product-ai.ts`, réutilisés tels quels.
- Les couleurs s'écrivent en attributs `Couleur` = `nom|#hex`, les dimensions en `Longueur`, `Hauteur`, `Largeur`, `Poids` (convention du wizard et de `products-ai.ts`).
- Slug généré depuis le nom via `slugify`, suffixe anti-collision (`-2`, `-3`, … jusqu'à 20 essais, puis slug placeholder `draft-<id>`), même logique que `products-ai.ts`.
- `base_price` par défaut 0 si absent : le brouillon peut être créé avant la tarification et complété ensuite.
- Écriture en un seul `db.batch` : insertion du produit + attributs.

**`update_product_draft`** → `{ id, slug }`

- `id` + les mêmes champs que la création, tous optionnels, plus `slug` (validé, unicité vérifiée).
- Un champ absent est ignoré, `null` efface la valeur.
- `attributes` fourni remplace l'ensemble des attributs (comportement de l'étape 2 du wizard).
- `story` et `seo` : chaque sous-champ fourni remplace la valeur correspondante.

**`add_product_images`** → `{ results: [{ url, ok, image_id?, reason? }], primary_image_id }`

- `id`, `images: [{ url, alt? }]`, ≤8 par appel, ≤12 images au total par produit (`limit_exceeded` sinon, avant tout téléchargement).
- Chaque URL passe par `fetchAndUploadImage` (garde SSRF, 5 Mo max, 10 s, types image seulement).
- Succès partiel = résultat normal (pas `isError`), chaque échec porte sa raison (`ssrf`, `bad_status`, `bad_content_type`, `too_large`, `timeout`, `fetch_failed`, `upload_failed`).
- La première image du produit devient `is_primary` ; `sort_order` continue après les images existantes.

**`remove_product_image`** → `{ removed: true }`

- `id`, `image_id`. Supprime la ligne et l'objet R2. Si l'image était primaire, la suivante par `sort_order` devient primaire.

**`set_product_variants`** → `{ variants: [{ id, color_name, color_hex, price, stock }], stock_quantity }`

- `id`, `variants: [{ color_name, color_hex, stock, price? }]`, `uniform_price` (défaut `true`).
- Mêmes règles que `saveColorVariants` : `price` absent ou `uniform_price` → prix de base ; variantes existantes de même couleur mises à jour ; variantes retirées supprimées et leurs images désassociées (`variant_id = NULL`) ; `stock_quantity` du produit recalculé comme somme des stocks.
- Les couleurs déclarées ici doivent correspondre aux attributs `Couleur` ; la documentation de l'outil le rappelle, aucune synchronisation automatique en phase 1.

**`delete_product_draft`** → `{ deleted: true }`

- Supprime la ligne (cascade sur attributs, images, variantes) puis les objets R2 des images.

### Invariants

- Aucun outil n'accepte ni n'écrit `is_draft`, `is_active`, `is_featured`.
- Chaque `UPDATE`/`DELETE` porte `is_draft = 1` dans son `WHERE`.
- Chaque outil d'écriture enregistre une ligne `audit_log` : `actor_id`/`actor_name` = admin porteur du jeton, `target_type = "product"`, `details = { via: "mcp", tool, client_id, client_name }`.

## 5. Gestion d'erreurs

- **Avant les outils** : 401 par `withMcpAuth` (jeton absent, invalide ou expiré), 403 par `assertAdminContext` (rôle insuffisant, ban, utilisateur supprimé). Réponses JSON-RPC ; le serveur MCP n'est jamais instancié.
- **Codes d'erreur d'outil** : `validation_error` (avec `fieldErrors`), `not_found`, `conflict` (slug ou SKU déjà pris), `limit_exceeded`, `internal_error`. Messages en français, destinés à être relayés à l'admin par l'IA.
- **Atomicité** : écritures multi-tables via `db.batch` (une transaction D1 implicite), comme `importCandidateImages`. Pour les images : upload R2 d'abord, puis batch d'insertion ; en cas d'échec du batch, suppression compensatoire des objets R2 uploadés, échecs de nettoyage journalisés mais non propagés.
- **Journalisation** : `console.error("[mcp/<outil>] …")` avec l'id du produit et de l'utilisateur, jamais le jeton. Workers Logs retient 7 jours.
- **Erreurs inattendues** : attrapées au niveau du registre d'outils, transformées en `internal_error` générique. Aucune stack trace ne sort vers le client.

## 6. Tests

### Unitaires (Vitest, `__tests__/unit/`)

- `lib/validations/mcp-product.ts` : bornes, hex, tailles de listes, `null` vs absent.
- `assertAdminContext` : `customer` → 403, banni → 403, `admin`/`super_admin` → ok, utilisateur inexistant → 403.
- Hook `before` sur `/mcp/authorize` : `prompt=consent` forcé quelle que soit l'entrée (absent, `none`, `login`).
- Handlers d'outils avec `product-drafts` mocké : mapping des erreurs, forme des résultats, succès partiel des images, refus d'un produit publié, audit enregistré.
- `product-drafts.ts` : génération de slug avec collisions, calcul de `stock_quantity` des variantes, réattribution de l'image primaire, sur le pattern de mock DB des tests existants.
- `scripts/check-migration-safety.mjs` valide la migration en pre-commit.

### Bout en bout (checklist manuelle)

1. Local : `npm run dev`, puis `claude mcp add --transport http netereka http://localhost:3000/api/mcp`, `/mcp` dans Claude Code → login admin → page de consentement → liste des outils visible.
2. Créer un brouillon complet (fiche, story, SEO, attributs, prix, images, variantes), l'ouvrir dans le wizard admin (`/products/<id>/edit`), vérifier chaque étape, publier depuis le wizard.
3. Vérifier qu'un compte `customer` obtient 403 sur `/api/mcp` après le flux OAuth.
4. Vérifier qu'un produit publié est refusé par `update_product_draft` et `delete_product_draft`.
5. Après déploiement : connecteur claude.ai sur `https://netereka.ci/api/mcp`.

## Hors périmètre phase 1

- Rate limiting propre à `/api/mcp`.
- Ressources et prompts MCP (outils seulement).
- Outils commandes, clients, catégories en écriture.
- Interface de révocation des clients OAuth (les jetons de rafraîchissement expirent en 7 jours ; la suppression d'un compte cascade sur ses jetons).
- Retrait de la fonctionnalité IA embarquée (`/products/ai-new`).
- Refus des non-admins dès la page de consentement.
