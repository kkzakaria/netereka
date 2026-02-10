# Rapport d'Audit de Securite — NETEREKA E-Commerce

**Date :** 10 fevrier 2026
**Portee :** Audit de securite avance couvrant l'ensemble du projet NETEREKA
**Plateforme :** Next.js 16.1 / Cloudflare Workers / D1 SQLite / better-auth
**Methode :** Revue statique du code source (SAST), analyse des dependances (SCA), examen architectural

---

## Resume Executif

| Categorie | Critique | Haute | Moyenne | Basse | Info |
|-----------|----------|-------|---------|-------|------|
| Authentification & Autorisation | 0 | 2 | 3 | 2 | 3 |
| Injection & Validation des Entrees | 0 | 1 | 3 | 2 | 0 |
| Base de Donnees | 0 | 2 | 2 | 3 | 0 |
| Upload de Fichiers & Stockage | 0 | 0 | 1 | 0 | 0 |
| Configuration & En-tetes HTTP | 0 | 1 | 1 | 1 | 0 |
| Dependances (SCA) | 0 | 2 | 3 | 0 | 0 |
| Logique Metier | 0 | 1 | 2 | 2 | 0 |
| **Total** | **0** | **9** | **15** | **10** | **3** |

**Posture globale : BONNE avec des points d'amelioration importants.**
Aucune vulnerabilite critique trouvee. Les fondamentaux de securite (requetes parametrees, gardes d'authentification, validation Zod, protection IDOR) sont correctement implementes. Les constats de severite haute doivent etre traites avant la mise en production.

---

## Table des Matieres

1. [Authentification & Gestion des Sessions](#1-authentification--gestion-des-sessions)
2. [Autorisation & Controle d'Acces](#2-autorisation--controle-dacces)
3. [Injection SQL & Validation des Entrees](#3-injection-sql--validation-des-entrees)
4. [Upload de Fichiers & Stockage R2](#4-upload-de-fichiers--stockage-r2)
5. [Securite Cote Client (XSS, localStorage)](#5-securite-cote-client)
6. [En-tetes HTTP & Configuration](#6-en-tetes-http--configuration)
7. [Base de Donnees & Schema](#7-base-de-donnees--schema)
8. [Dependances & Supply Chain](#8-dependances--supply-chain)
9. [Logique Metier](#9-logique-metier)
10. [Points Positifs](#10-points-positifs)
11. [Plan de Remediation](#11-plan-de-remediation)

---

## 1. Authentification & Gestion des Sessions

### HAUTE — H-AUTH-01 : Politique de Mot de Passe Faible

**Fichier :** `lib/validations/account.ts:18`

La validation du mot de passe n'exige que 8 caracteres minimum, sans aucune exigence de complexite (majuscules, minuscules, chiffres, caracteres speciaux).

```typescript
newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caracteres"),
```

**Risque :** Permet des mots de passe trivialement craquables comme `12345678` ou `abcdefgh`.

**Recommandation :** Ajouter des regles de complexite :
```typescript
newPassword: z.string()
  .min(10)
  .regex(/[A-Z]/, "Doit contenir une majuscule")
  .regex(/[a-z]/, "Doit contenir une minuscule")
  .regex(/[0-9]/, "Doit contenir un chiffre")
```

---

### HAUTE — H-AUTH-02 : Tokens OAuth et Sessions Stockes en Clair dans D1

**Fichier :** `lib/db/schema.ts:45, 60-64`

Les tokens OAuth (access, refresh, id) et les tokens de session sont stockes sans chiffrement dans la base de donnees D1 :

```typescript
// Sessions
token: text("token").unique().notNull(),          // ligne 45

// Comptes OAuth
accessToken: text("accessToken"),                  // ligne 60
refreshToken: text("refreshToken"),                // ligne 61
idToken: text("idToken"),                          // ligne 62
```

**Risque :** En cas de compromission de la base D1 (fuite, backup non protege, acces non autorise), tous les tokens de session et OAuth sont directement exploitables, permettant un detournement massif de comptes.

**Recommandation :** Hasher les tokens de session (SHA-256 cote serveur, comparer le hash). Chiffrer les tokens OAuth avec une cle symetrique (AES-256-GCM) stockee dans un KV secret Cloudflare.

---

### MOYENNE — M-AUTH-01 : Layout Admin Auth Sans Guard requireGuest()

**Fichier :** `app/(admin-auth)/layout.tsx`

Le layout de la page de connexion admin n'appelle pas `requireGuest()`, contrairement au layout d'auth client (`app/(auth)/auth/layout.tsx`). Un utilisateur deja authentifie (y compris un client) peut acceder au formulaire de login admin.

**Recommandation :** Ajouter `await requireGuest()` dans le layout.

---

### MOYENNE — M-AUTH-02 : Verification du Role Admin Apres Authentification

**Fichier :** `app/(admin-auth)/admin/login/page.tsx:80-85`

La verification du role admin (`verifyAdminRole()`) s'effectue apres que l'utilisateur est deja authentifie cote client. Il existe une fenetre temporelle ou un utilisateur non-admin possede une session valide.

```typescript
const { error } = await authClient.signIn.email({...});
// <- Fenetre vulnerable : utilisateur authentifie mais role non verifie
const result = await verifyAdminRole();
```

**Recommandation :** Deplacer la verification de role dans un hook `after` de better-auth cote serveur, avant que la session soit etablie.

---

### MOYENNE — M-AUTH-03 : Rate Limiting Insuffisant sur Forgot Password

**Fichier :** `lib/auth/index.ts:55`

Le rate limiting autorise 3 requetes par minute sur `/forgot-password`. Combine a l'absence de verrouillage de compte, cela permet l'enumeration d'adresses email valides (180 tentatives par heure).

**Recommandation :** Reduire a 1 requete/minute ou implementer un backoff exponentiel et uniformiser les messages d'erreur pour ne pas reveler l'existence d'un compte.

---

### BASSE — L-AUTH-01 : Configuration Cookie de Session Non Explicite

**Fichier :** `lib/auth/index.ts:58-63`

La configuration de session ne montre pas explicitement les flags `HttpOnly`, `Secure`, `SameSite`. Bien que better-auth les gere probablement par defaut, l'absence de configuration explicite rend l'audit difficile.

---

### BASSE — L-AUTH-02 : Contexte Utilisateur Implicite dans le Changement de Mot de Passe

**Fichier :** `actions/account.ts:35-61`

La fonction `changePassword()` appelle `requireAuth()` sans capturer l'ID utilisateur. La resolution de l'utilisateur cible depend entierement de l'extraction implicite de session par better-auth via les headers.

---

## 2. Autorisation & Controle d'Acces

### HAUTE — H-AUTHZ-01 : Fonction toggleCustomerActive() Non Fonctionnelle

**Fichier :** `actions/admin/customers.ts:94-141`

Cette fonction est un placeholder qui ne desactive pas reellement les comptes :

```typescript
const newActive = 0;  // TOUJOURS 0, jamais change (ligne 116)

// UPDATE ne modifie que le timestamp, pas de colonne de statut (ligne 120-122)
"UPDATE user SET updatedAt = datetime('now') WHERE id = ?"
```

**Risque :** Les administrateurs croient pouvoir desactiver des comptes, mais l'action n'a aucun effet. Aucun mecanisme de bannissement n'est operationnel.

**Recommandation :** Ajouter une colonne `is_active` (ou `banned`/`bannedAt`) a la table `user` et implementer la logique de desactivation effective.

---

### INFO — I-AUTHZ-01 : Protection IDOR Correctement Implementee

Toutes les operations sensibles verifient la propriete des ressources :
- `getAddressById(id, userId)` — `WHERE id = ? AND user_id = ?`
- `getOrderDetail(orderNumber, userId)` — verifie le proprietaire
- `deleteProductImage(imageId, productId)` — verifie l'appartenance
- Reviews : verifie que l'utilisateur a achete et recu le produit

---

### INFO — I-AUTHZ-02 : Prevention d'Escalade de Privileges

Le champ `role` dans better-auth est configure avec `input: false` (`lib/auth/index.ts:44`), empechant un utilisateur de s'auto-attribuer un role admin. Les changements de role necessitent `super_admin`.

---

## 3. Injection SQL & Validation des Entrees

### INFO — I-SQL-01 : Pas de Vulnerabilite d'Injection SQL Detectee

Toutes les requetes utilisent des requetes preparees avec `.bind()` via l'API D1 Cloudflare (`lib/db/index.ts`). Les placeholders `?` sont utilises systematiquement. Aucune concatenation de chaine dans les requetes SQL.

```typescript
// Pattern correct utilise partout
const result = await db.prepare(sql).bind(...params).all<T>();
```

---

### HAUTE — H-INJ-01 : Pattern de Construction SQL Dynamique Fragile

**Fichiers :** `actions/checkout.ts:111-113`, `lib/db/search.ts:27-28`, `lib/db/orders.ts:206-211`, `lib/db/admin/audit-log.ts:107-135`, `lib/db/admin/orders.ts:89-90`

Bien que securise actuellement (les placeholders sont des `?` hardcodes), le pattern de construction dynamique de clauses WHERE et IN est fragile :

```typescript
// checkout.ts:111-113
const placeholdersP = productIds.map(() => "?").join(",");
const productsPromise = query<Product>(
  `SELECT * FROM products WHERE id IN (${placeholdersP}) AND is_active = 1`,
  productIds
);

// search.ts:27-28
const placeholders = opts.brands.map(() => "?").join(", ");
conditions.push(`p.brand IN (${placeholders})`);
```

**Risque :** Le pattern est correct car seuls des `?` sont interpoles. Cependant, un futur developpeur pourrait accidentellement interpoler une valeur utilisateur, introduisant une injection SQL.

**Recommandation :** Migrer progressivement ces requetes vers le query builder Drizzle ORM qui gere la securite des parametres automatiquement.

---

### MOYENNE — M-INJ-01 : Validation Insuffisante du Terme de Recherche

**Fichier :** `actions/search.ts:6-21`

La recherche n'exige que 2 caracteres minimum, sans filtrage de caracteres speciaux SQL LIKE :

```typescript
if (!term || term.length < 2) return [];
const like = `%${term}%`;
```

**Risque :** Des patterns comme `%a%` ou `__%` avec des wildcards multiples peuvent generer des requetes lentes sur un catalogue volumineux.

**Recommandation :** Echapper les caracteres `%` et `_` dans le terme de recherche :
```typescript
const escaped = term.replace(/%/g, '\\%').replace(/_/g, '\\_');
const like = `%${escaped}%`;
```

---

### MOYENNE — M-INJ-02 : Divulgation d'Information dans la Gestion d'Erreurs

**Fichier :** `actions/checkout.ts:285-289`

L'erreur brute est renvoyee au client lors de la creation de commande :

```typescript
catch (error) {
  const message = error instanceof Error
    ? error.message  // <- Message d'erreur interne expose
    : "Erreur lors de la creation de la commande";
  return { success: false, error: message };
}
```

**Risque :** Les messages d'erreur internes (chemins de fichiers, noms de tables, erreurs D1) pourraient fuiter vers le client.

**Recommandation :** Logger l'erreur cote serveur et renvoyer un message generique.

---

### MOYENNE — M-INJ-03 : Absence de Limite Superieure sur les Prix

**Fichiers :** `actions/admin/products.ts:21-23`, `actions/admin/variants.ts:15-16`

Les schemas Zod pour les prix n'ont pas de borne superieure :

```typescript
base_price: z.coerce.number().int().min(0, "Le prix doit etre positif"),
```

**Recommandation :** Ajouter `.max(999_999_999, "Prix trop eleve")` pour prevenir des valeurs aberrantes.

---

### BASSE — L-INJ-01 : Enumeration de Codes Promo

**Fichier :** `actions/checkout.ts:39-49`

Les messages d'erreur distincts pour chaque etat du code promo (invalide, pas encore actif, expire) permettent de confirmer l'existence d'un code.

---

### BASSE — L-INJ-02 : Parsing JSON d'Attributs de Variante Sans Schema

**Fichier :** `components/storefront/variant-selector.tsx:8-13`

Le champ `variant.attributes` est parse sans validation de schema :

```typescript
function parseAttributes(variant: ProductVariant): ParsedVariantAttributes {
  try { return JSON.parse(variant.attributes); }
  catch { return {}; }
}
```

**Recommandation :** Valider le JSON parse avec un schema Zod.

---

## 4. Upload de Fichiers & Stockage R2

### MOYENNE — M-UPLOAD-01 : Validation d'Image par MIME Type Seulement

**Fichier :** `actions/admin/images.ts:27-33`

La validation d'upload d'images repose uniquement sur `file.type` (controle par le client) :

```typescript
if (!file.type.startsWith("image/")) {
  return { success: false, error: "Le fichier doit etre une image" };
}
```

**Problemes :**
1. `file.type` est une valeur fournie par le client, falsifiable
2. Pas de validation de l'extension du fichier
3. Pas de verification des octets magiques (magic bytes) du contenu
4. L'extension est extraite du nom sans whitelist (`actions/admin/images.ts:36`)

**Risque :** Un fichier malveillant (HTML, SVG avec script, executable) pourrait etre uploade avec un MIME type `image/jpeg`.

**Recommandation :**
```typescript
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"];
const ext = (file.name.split(".").pop() || "").toLowerCase();
if (!ALLOWED_EXTENSIONS.includes(ext)) {
  return { success: false, error: "Format non autorise" };
}
// + Verifier les magic bytes cote serveur
```

---

## 5. Securite Cote Client

### BONNE PRATIQUE : Pas de Donnees Sensibles dans localStorage

**Fichier :** `stores/cart-store.ts`

Le store Zustand ne persiste que les articles du panier (`productId`, `variantId`, `quantity`, `price`). Pas de tokens, pas de donnees personnelles.

### BONNE PRATIQUE : Protection XSS dans les Templates Email

**Fichier :** `lib/notifications/templates.ts:8-14`

La fonction `escapeHtml()` echappe correctement `&`, `<`, `>`, `"` dans toutes les donnees utilisateur injectees dans les templates HTML.

### BONNE PRATIQUE : JSON-LD Securise

**Fichier :** `components/seo/json-ld.tsx:6-9`

Les donnees JSON-LD sont correctement echappees (`<`, `>`, `&`) avant injection via `dangerouslySetInnerHTML`.

### BONNE PRATIQUE : Prix Re-valides Cote Serveur

**Fichier :** `actions/checkout.ts:170-211`

Les prix sont recalcules a partir de la base de donnees au moment du checkout, pas trusted depuis le panier client.

---

## 6. En-tetes HTTP & Configuration

### HAUTE — H-HDR-01 : Absence de Security Headers

**Fichier :** `next.config.ts` (aucun header configure)

Aucun en-tete de securite n'est configure :

| En-tete Manquant | Risque |
|-------------------|--------|
| `Content-Security-Policy` | XSS non attenue |
| `X-Frame-Options` | Clickjacking possible |
| `X-Content-Type-Options` | MIME sniffing |
| `Referrer-Policy` | Fuite de donnees via referrer |
| `Permissions-Policy` | Acces non restreint aux API du navigateur |
| `Strict-Transport-Security` | Downgrade HTTPS possible |

**Recommandation :** Ajouter dans `next.config.ts` :
```typescript
const nextConfig: NextConfig = {
  headers: async () => [{
    source: "/(.*)",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "Content-Security-Policy", value: "default-src 'self'; ..." },
    ],
  }],
};
```

---

### MOYENNE — M-HDR-01 : Absence de Middleware de Securite

Aucun fichier `middleware.ts` a la racine du projet pour appliquer des en-tetes de securite globalement. Le fichier `proxy.ts` gere uniquement l'authentification de route.

---

### BASSE — L-HDR-01 : Source Maps en Production Non Explicitement Desactivees

**Fichier :** `next.config.ts`

`productionBrowserSourceMaps` n'est pas configure. Next.js les desactive par defaut, mais une configuration explicite est recommandee.

---

## 7. Base de Donnees & Schema

### HAUTE — H-DB-01 : Contrainte FK Cassee dans l'Audit Log

**Fichier :** `db/migrations/0007_audit_log.sql:11`

La table audit_log reference l'ancienne table `users` au lieu de la table `user` de better-auth :

```sql
FOREIGN KEY (actor_id) REFERENCES users(id)  -- devrait etre user(id)
```

**Risque :** Erreurs d'integrite referentielle si la table legacy `users` est supprimee.

---

### HAUTE — H-DB-02 : Absence de Contraintes CHECK sur les Montants Financiers

**Fichier :** `db/migrations/0001_initial.sql`

Les colonnes financieres n'ont pas de contraintes de non-negativite :

| Colonne | Ligne | Probleme |
|---------|-------|----------|
| `base_price` | 64 | Peut etre negatif |
| `stock_quantity` | 70 | Pas de CHECK >= 0 |
| `price` (variant) | 84 | Peut etre negatif |
| `delivery_fee` | 131 | Peut etre negatif |
| `discount_amount` | 132 | Pas de CHECK >= 0 |
| `quantity` (order_item) | 154 | Peut etre negatif |
| `unit_price` | 155 | Peut etre negatif |
| `total_price` | 156 | Peut etre negatif |

**Recommandation :** Ajouter des contraintes CHECK via une nouvelle migration :
```sql
ALTER TABLE products ADD CHECK (base_price >= 0);
ALTER TABLE products ADD CHECK (stock_quantity >= 0);
-- etc.
```

---

### MOYENNE — M-DB-01 : Mots de Passe de Test en Clair dans le Seed

**Fichier :** `db/seeds/seed.sql:2-3`

```sql
-- Password for all test users: Test123!
```

**Risque :** Si le seed est accidentellement deploye en production, les comptes de test sont immediatement exploitables.

**Recommandation :** Supprimer le commentaire avec le mot de passe en clair. Documenter les identifiants de test dans un README protege.

---

### MOYENNE — M-DB-02 : Double Table Utilisateurs (Legacy + Better-Auth)

**Fichiers :** `db/migrations/0001_initial.sql`, `db/migrations/0002_better_auth.sql`

Deux tables `users` (legacy) et `user` (better-auth) coexistent, creant un risque d'incoherence des donnees.

**Recommandation :** Completer la migration en supprimant la table legacy `users` et en mettant a jour toutes les references FK.

---

### BASSE — L-DB-01 : Index Manquants pour les Operations Frequentes

Index manquants identifies :
- `delivery_zones.is_active` — filtre courant
- `session.expiresAt` — nettoyage de sessions
- `products(is_active, is_featured)` — index composite pour la page d'accueil

---

### BASSE — L-DB-02 : Pas d'Audit Trail pour les Actions Client

La table `audit_log` ne trace que les actions admin. Les modifications de donnees client (changement de mot de passe, mise a jour d'adresse, changement d'email) ne sont pas tracees.

---

### BASSE — L-DB-03 : Numeros de Commande Potentiellement Previsibles

**Fichier :** `lib/db/orders.ts:7-14`

Le generateur utilise `Math.random()` (non cryptographique) avec seulement 6 caracteres alphanumeriques (~2.1 milliards de combinaisons) :

```typescript
result += chars.charAt(Math.floor(Math.random() * chars.length));
```

**Recommandation :** Utiliser `crypto.getRandomValues()` et augmenter la longueur a 8-10 caracteres.

---

## 8. Dependances & Supply Chain

### HAUTE — H-DEP-01 : xlsx (v0.18.5) — 2 Vulnerabilites Connues

| CVE | Severite | Description |
|-----|----------|-------------|
| Prototype Pollution | CVSS 7.8 | Versions < 0.19.3 |
| ReDoS | CVSS 7.5 | Versions < 0.20.2 |

**Fichier :** `package.json:64`

**Recommandation :** Mettre a jour vers `>=0.20.2` ou remplacer par une alternative (ExcelJS, Papa Parse pour CSV uniquement).

---

### HAUTE — H-DEP-02 : @modelcontextprotocol/sdk — Fuite de Donnees Inter-Clients

| Severite | CVSS | Versions Affectees |
|----------|------|-------------------|
| HIGH | 7.1 | 1.10.0 - 1.25.3 |

Dependance transitive via la configuration MCP shadcn. Risque de fuite de donnees entre instances de clients MCP.

**Recommandation :** Verifier si la version installee est affectee et mettre a jour.

---

### MOYENNE — M-DEP-01 : fast-xml-parser — DoS via Entites Numeriques

Severite CVSS 7.5, versions `>=4.3.6 <=5.3.3`. Dependance transitive via `@aws-sdk` (utilise par `@opennextjs/cloudflare`).

---

### MOYENNE — M-DEP-02 : esbuild — Bypass CORS du Serveur de Dev

Affecte `drizzle-kit` via sa chaine de dependances. Impact limite au mode developpement.

---

### MOYENNE — M-DEP-03 : @isaacs/brace-expansion — Consommation de Ressources Non Controlee

Versions `<=5.0.0`. Dependance transitive. Risque de DoS via expansion de patterns.

---

### BONNE PRATIQUE : Aucun Script Malveillant Detecte

Pas de `postinstall`, `preinstall` ou autre script suspect dans `package.json` ou les dependances directes. Le hook `prepare` ne lance que `husky` (legitimate).

---

## 9. Logique Metier

### HAUTE — H-BIZ-01 : Absence de Rate Limiting sur les Actions Sensibles

**Fichiers concernes :**

| Action | Fichier | Risque |
|--------|---------|--------|
| `createOrder()` | `actions/checkout.ts:92` | Spam de commandes, manipulation d'inventaire |
| `submitReview()` | `actions/reviews.ts:10` | Spam d'avis, atteinte a la reputation |
| `createAddressAction()` | `actions/addresses.ts:16` | Epuisement de ressources |
| `toggleWishlist()` | `actions/wishlist.ts:11` | Scraping automatise |
| `getSearchSuggestions()` | `actions/search.ts:6` | Enumeration de produits, DoS |

better-auth implemente un rate limiting sur les endpoints d'authentification, mais aucune protection equivalente n'existe sur les server actions fonctionnelles.

**Recommandation :** Implementer un rate limiting par utilisateur en utilisant Cloudflare KV :
- Commandes : 10/heure/utilisateur
- Avis : 10/jour/utilisateur
- Recherche : 100/heure/IP
- Adresses : 20/jour/utilisateur

---

### MOYENNE — M-BIZ-01 : Incoherence de Validation des Zones de Livraison

**Fichiers :** `actions/addresses.ts:28-38` vs `actions/checkout.ts:147-151`

La creation d'adresse permet de sauvegarder une adresse sans zone de livraison valide (`zoneId: zone?.id ?? null`), mais le checkout exige une zone valide. Resultat : des adresses sauvegardees deviennent inutilisables au checkout.

---

### MOYENNE — M-BIZ-02 : Echecs Silencieux des Notifications Email

**Fichiers :** `actions/checkout.ts:291-309`, `actions/admin/orders.ts:54-69`

Les notifications email sont fire-and-forget. Un echec d'envoi n'est ni signale a l'utilisateur, ni enregistre en base :

```typescript
notifyOrderConfirmation(...).catch((err) =>
  console.error("[checkout] notification error:", err)
);
return { success: true, orderNumber };  // Succes meme si l'email a echoue
```

**Recommandation :** Enregistrer les echecs d'envoi en base et implementer un mecanisme de retry.

---

### BASSE — L-BIZ-01 : Recherche Publique Sans Authentification

**Fichier :** `actions/search.ts:6`

`getSearchSuggestions()` est accessible sans authentification. Ce comportement est probablement intentionnel (fonctionnalite de recherche publique), mais combine a l'absence de rate limiting (H-BIZ-01), il permet une enumeration non controlee du catalogue.

---

### BASSE — L-BIZ-02 : Protection CSV Injection Correcte

**Fichier :** `lib/csv/orders.ts:3-10`

La fonction `escapeCSV()` implemente correctement le standard RFC 4180, echappant les guillemets, virgules et sauts de ligne. Pas de risque d'injection de formule.

---

## 10. Points Positifs

Le projet demontre une bonne maturite en securite sur plusieurs aspects :

| Aspect | Detail | Fichier |
|--------|--------|---------|
| Requetes SQL parametrees | Toutes les requetes utilisent `.bind()` avec des `?` | `lib/db/index.ts` |
| Protection IDOR | Toutes les operations verifient `user_id` | `lib/db/addresses.ts`, `lib/db/orders.ts` |
| Validation Zod systematique | Toutes les server actions valident les entrees | `lib/validations/*`, `actions/*` |
| Captcha Turnstile | Active sur tous les endpoints d'authentification | `lib/auth/index.ts:65-70` |
| Transactions atomiques | Creation de commande avec decrementation de stock atomique | `lib/db/orders.ts:41-175` |
| Pas de mass assignment | Tous les champs explicitement enumeres dans les schemas | `actions/*` |
| Role non modifiable par le client | `input: false` sur le champ `role` | `lib/auth/index.ts:44` |
| Machine d'etat des commandes | Transitions de statut validees | `lib/constants/orders.ts` |
| Secrets non commites | `.env*` et `.dev.vars` dans `.gitignore` | `.gitignore:34-35` |
| Templates email echappes | `escapeHtml()` sur toutes les valeurs utilisateur | `lib/notifications/templates.ts:8-14` |
| Plafonnement du discount | Le discount est cap au sous-total | `actions/checkout.ts:63` |
| Total minimum a 0 | `Math.max(0, ...)` empeche les totaux negatifs | `actions/checkout.ts:233` |
| Verification d'achat pour les avis | Un utilisateur ne peut noter qu'un produit achete et recu | `lib/db/reviews.ts` |

---

## 11. Plan de Remediation

### Priorite 1 — Avant Mise en Production

| ID | Constat | Impact | Effort |
|----|---------|--------|--------|
| H-HDR-01 | Ajouter les security headers | XSS, clickjacking | Faible |
| H-AUTH-01 | Renforcer la politique de mot de passe | Comptes compromis | Faible |
| H-DEP-01 | Mettre a jour xlsx >= 0.20.2 | Prototype Pollution, ReDoS | Faible |
| H-DB-02 | Ajouter CHECK constraints sur montants financiers | Donnees corrompues | Faible |
| H-BIZ-01 | Implementer rate limiting sur les server actions | Abus, spam, DoS | Moyen |
| H-AUTH-02 | Chiffrer tokens OAuth et hasher tokens de session | Compromission massive | Moyen |

### Priorite 2 — Sprint Suivant

| ID | Constat | Impact | Effort |
|----|---------|--------|--------|
| H-AUTHZ-01 | Implementer toggleCustomerActive() ou le retirer | Gestion utilisateurs non fonctionnelle | Moyen |
| H-INJ-01 | Migrer les requetes dynamiques vers Drizzle ORM | Fragilite du code | Eleve |
| H-DB-01 | Corriger FK audit_log vers table `user` | Integrite referentielle | Faible |
| H-DEP-02 | Verifier/mettre a jour @modelcontextprotocol/sdk | Fuite de donnees MCP | Faible |
| M-UPLOAD-01 | Ajouter validation d'extension et magic bytes | Upload de fichiers malveillants | Moyen |
| M-AUTH-02 | Deplacer la verification de role admin cote serveur | Fenetre d'escalade temporaire | Moyen |
| M-INJ-02 | Uniformiser la gestion d'erreurs (messages generiques) | Fuite d'information interne | Faible |

### Priorite 3 — Amelioration Continue

| ID | Constat | Impact | Effort |
|----|---------|--------|--------|
| M-AUTH-01 | Ajouter requireGuest() au layout admin auth | Acces formulaire admin | Faible |
| M-AUTH-03 | Reduire rate limit forgot-password | Enumeration d'emails | Faible |
| M-INJ-01 | Echapper wildcards dans les recherches LIKE | Requetes lentes | Faible |
| M-INJ-03 | Ajouter max() sur les schemas de prix | Valeurs aberrantes | Faible |
| M-DB-01 | Retirer mot de passe en clair du seed | Deploiement accidentel | Faible |
| M-DB-02 | Finaliser migration dual tables users/user | Coherence des donnees | Eleve |
| M-BIZ-01 | Harmoniser validation zone livraison | Adresses inutilisables | Faible |
| M-BIZ-02 | Tracer les echecs d'envoi d'email | Notifications perdues | Moyen |
| L-DB-01 | Ajouter les index manquants | Performance | Faible |
| L-DB-03 | Utiliser crypto.getRandomValues() pour les numeros de commande | Previsibilite | Faible |

---

## Annexe A — Methodologie

L'audit a couvert les domaines suivants conformement au referentiel OWASP Top 10 (2021) et aux bonnes pratiques ASVS :

1. **A01:2021 — Broken Access Control** : Revue des gardes d'auth, IDOR, escalade de privileges
2. **A02:2021 — Cryptographic Failures** : Stockage de tokens, hachage de mots de passe
3. **A03:2021 — Injection** : SQL injection, XSS, template injection, CSV injection
4. **A04:2021 — Insecure Design** : Logique metier, machine d'etat, rate limiting
5. **A05:2021 — Security Misconfiguration** : Headers HTTP, CORS, source maps
6. **A06:2021 — Vulnerable Components** : Analyse SCA via `npm audit`
7. **A07:2021 — Auth Failures** : Sessions, cookies, politique de mot de passe
8. **A08:2021 — Data Integrity Failures** : Contraintes DB, validation des entrees
9. **A09:2021 — Logging & Monitoring** : Audit trail, gestion des erreurs
10. **A10:2021 — SSRF** : Non applicable (pas de fetch URL dynamique cote serveur)

---

*Fin du rapport.*
