# Architecture Technique - Boutique E-Commerce

## Produits Électroniques | Cloudflare Developer Platform

**Marché :** Côte d'Ivoire | **Devise :** XOF (Franc CFA)

**Stack Principal :** Next.js 16 + OpenNext + Cloudflare Workers

**Date :** Janvier 2026

---

## Sommaire

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [Spécifications Fonctionnelles](#2-spécifications-fonctionnelles)
3. [Architecture Technique Globale](#3-architecture-technique-globale)
4. [Stack Technologique Détaillé](#4-stack-technologique-détaillé)
5. [Modèle de Données](#5-modèle-de-données-d1---sqlite)
6. [APIs et Endpoints](#6-apis-et-endpoints)
7. [Sécurité et Authentification](#7-sécurité-et-authentification)
8. [Intégrations Externes](#8-intégrations-externes)
9. [Stratégie SEO E-Commerce](#9-stratégie-seo-e-commerce) ⭐ **Nouveau**
10. [Structure du Projet](#10-structure-du-projet)
11. [Plan de Déploiement](#11-plan-de-déploiement)
12. [Estimation des Coûts](#12-estimation-des-coûts)
13. [Roadmap de Développement](#13-roadmap-de-développement)

---

## 1. Résumé Exécutif

Ce document présente l'architecture technique complète d'une boutique en ligne de produits électroniques destinée au marché ivoirien, utilisant la plateforme Cloudflare Developer Platform.

### Contexte du Projet

| Paramètre | Valeur |
|-----------|--------|
| Marché cible | Côte d'Ivoire |
| Devise | Franc CFA (XOF) |
| TVA | Incluse dans les prix affichés |
| Catalogue initial | ~200 produits |
| Trafic estimé | 3 000 visiteurs/mois (lancement) |
| Mode de paiement | Paiement à la livraison (COD) |
| Livraison | Flotte de livreurs propre |

### Catégories de Produits

- Smartphones et accessoires
- Ordinateurs (portables et de bureau)
- Consoles de jeux et accessoires gaming
- Télévisions et équipements audio-vidéo
- Tablettes et liseuses
- Accessoires et périphériques

---

## 2. Spécifications Fonctionnelles

### 2.1 Fonctionnalités Client (Storefront)

#### Catalogue et Navigation

- Page d'accueil avec produits vedettes, promotions et nouveautés
- Navigation par catégories et sous-catégories
- Recherche simple avec autocomplétion
- Recherche avancée avec filtres multiples (prix, marque, caractéristiques)
- Fiches produits détaillées avec galerie d'images, spécifications, avis
- Produits similaires et recommandations

#### Gestion du Compte Client

- Inscription/Connexion (email/mot de passe)
- Authentification sociale (Google, Facebook, Apple)
- Profil utilisateur et gestion des adresses
- Historique des commandes avec suivi
- Liste de souhaits (wishlist)
- Gestion des avis produits

#### Processus d'Achat

- Panier persistant (synchronisé entre appareils)
- Application automatique des codes promo
- Calcul des frais de livraison par zone
- Checkout simplifié avec paiement à la livraison
- Confirmation de commande par email et WhatsApp
- Suivi de livraison en temps réel

### 2.2 Fonctionnalités Back-Office (Admin)

#### Gestion des Produits

- CRUD complet des produits avec éditeur riche
- Gestion des variantes (couleur, capacité, etc.)
- Import/export CSV pour mise à jour en masse
- Gestion des images avec optimisation automatique
- Gestion des catégories et attributs
- Gestion des stocks avec alertes de seuil

#### Gestion des Commandes

- Liste des commandes avec filtres et recherche
- Workflow de statut : En attente → Confirmée → En préparation → En livraison → Livrée
- Assignation aux livreurs
- Gestion des retours et annulations
- Génération de factures PDF

#### Marketing et Promotions

- Création de codes promo (pourcentage, montant fixe)
- Conditions d'application (min. achat, catégories, dates)
- Gestion des produits en promotion
- Bannières et mise en avant de produits

#### Rapports et Analytics

- Tableau de bord avec KPIs (ventes, commandes, panier moyen)
- Rapports de ventes par période, catégorie, produit
- Suivi des stocks et prévisions
- Analyse du comportement client

---

## 3. Architecture Technique Globale

L'architecture suit le modèle de référence Cloudflare Fullstack Application, optimisée pour les besoins spécifiques du e-commerce.

### 3.1 Vue d'Ensemble de l'Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 CLIENT (Browser / Mobile App)                │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           CLOUDFLARE EDGE (CDN + WAF + DDoS Protection)      │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│    │  SSL/TLS    │  │    WAF      │  │   Cache     │        │
│    └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              WORKERS (Serverless Compute)                    │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│    │  API REST   │  │    SSR      │  │    Auth     │        │
│    └─────────────┘  └─────────────┘  └─────────────┘        │
└───────┬─────────────────────┬─────────────────┬─────────────┘
        │                     │                 │
        ▼                     ▼                 ▼
┌───────────────┐     ┌───────────────┐  ┌────────────────────┐
│      D1       │     │      KV       │  │        R2          │
│   (SQLite)    │     │   (Cache)     │  │  (Object Storage)  │
│               │     │               │  │                    │
│ • Produits    │     │ • Sessions    │  │ • Images produits  │
│ • Commandes   │     │ • Panier      │  │ • Factures PDF     │
│ • Utilisateurs│     │ • Config      │  │ • Exports CSV      │
└───────────────┘     └───────────────┘  └────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE QUEUES                         │
│    ┌─────────────────┐  ┌─────────────────────────────┐     │
│    │ Email Queue     │  │ WhatsApp Notifications Queue │     │
│    └─────────────────┘  └─────────────────────────────┘     │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SERVICES EXTERNES                          │
│    ┌─────────┐  ┌───────────────┐  ┌─────────────────┐      │
│    │ Resend  │  │ WhatsApp API  │  │  OAuth Providers │      │
│    │ (Email) │  │    (Meta)     │  │ Google/FB/Apple  │      │
│    └─────────┘  └───────────────┘  └─────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Flux de Données Principal

| Étape | Description |
|-------|-------------|
| 1. Requête client | L'utilisateur accède au site via navigateur ou app mobile |
| 2. Edge Security | Cloudflare applique WAF, protection DDoS, validation SSL/TLS |
| 3. Cache CDN | Les assets statiques sont servis depuis le cache global |
| 4. Workers | Le code serverless traite les requêtes dynamiques |
| 5. Data Layer | D1 pour les données relationnelles, KV pour le cache, R2 pour les fichiers |
| 6. Response | La réponse est mise en cache si applicable et renvoyée au client |

---

## 4. Stack Technologique Détaillé

### 4.1 Analyse du Framework Frontend

Compte tenu de votre familiarité avec Next.js et des exigences du projet :

| Framework | Avantages | Inconvénients |
|-----------|-----------|---------------|
| **Next.js 16** | Familiarité, Turbopack stable, Cache Components, écosystème riche | APIs asynchrones (migration simple) |
| Next.js 15 | Stable, bien documenté | Sera progressivement déprécié |
| Remix | Conçu pour l'edge, loaders/actions natifs | Courbe d'apprentissage |
| Nuxt 3 | SSR natif, auto-imports | Écosystème Vue.js différent |

> **✅ Recommandation : Next.js 16.1 avec `@opennextjs/cloudflare`**
> 
> C'est désormais la méthode officielle recommandée par Cloudflare. OpenNext offre un support complet du Node.js runtime (contrairement à l'ancien `@cloudflare/next-on-pages` limité à Edge), permettant d'utiliser toutes les fonctionnalités de Next.js : ISR, Image Optimization, Server Actions, etc.

### 4.2 Pourquoi Next.js 16 + OpenNext ?

#### Avantages de Next.js 16

| Fonctionnalité | Description |
|----------------|-------------|
| **Turbopack stable** | Bundler par défaut, builds 2-5x plus rapides |
| **Cache Components** | Nouveau modèle avec PPR pour navigation instantanée |
| **`proxy.ts`** | Remplace `middleware.ts`, network boundary explicite |
| **DevTools MCP** | Intégration Model Context Protocol pour debugging AI |
| **File System Caching** | Temps de compilation réduits entre restarts |

#### Avantages de OpenNext vs next-on-pages

| `@opennextjs/cloudflare` (Nouveau) | `@cloudflare/next-on-pages` (Ancien) |
|------------------------------------|--------------------------------------|
| ✅ Node.js Runtime complet | ❌ Edge Runtime uniquement |
| ✅ Toutes les fonctionnalités Next.js | ❌ Fonctionnalités limitées |
| ✅ ISR (Incremental Static Regeneration) | ❌ Non supporté |
| ✅ Image Optimization native | ❌ Non supporté |
| ✅ Server Actions complets | ⚠️ Support partiel |
| ✅ Recommandé par Cloudflare | ⚠️ Déprécié |

### 4.3 Stack Complet

#### Frontend

| Composant | Technologie |
|-----------|-------------|
| Framework | **Next.js 16.1** (App Router) |
| Adaptateur Cloudflare | **@opennextjs/cloudflare** |
| Langage | TypeScript 5.x |
| Styling | Tailwind CSS 4.0 |
| Components UI | shadcn/ui (composants accessibles) |
| State Management | Zustand (léger, simple) |
| Forms | React Hook Form + Zod |
| Icônes | Lucide React |
| Bundler | Turbopack (défaut Next.js 16) |

#### Backend (Cloudflare)

| Service | Usage |
|---------|-------|
| Workers | API REST, logique métier, SSR |
| D1 | Base de données SQLite (produits, commandes, users) |
| KV | Cache sessions, panier, config |
| R2 | Stockage images produits, factures PDF |
| Queues | Traitement asynchrone (emails, notifications) |
| Workers AI | Recherche sémantique (optionnel, phase 2) |

#### Services Externes

| Service | Fournisseur |
|---------|-------------|
| Emails transactionnels | Resend ou Brevo (Sendinblue) |
| WhatsApp Business | Meta Cloud API ou Twilio |
| Auth OAuth | Google, Facebook, Apple Sign-In |
| Analytics | Cloudflare Web Analytics + Plausible |

---

## 5. Modèle de Données (D1 - SQLite)

### 5.1 Schéma des Tables Principales

#### Table: `users`

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID v4
  email TEXT UNIQUE NOT NULL,             -- Email de connexion
  password_hash TEXT,                     -- Hash bcrypt (null si OAuth)
  full_name TEXT NOT NULL,                -- Nom complet
  phone TEXT,                             -- Numéro WhatsApp
  auth_provider TEXT DEFAULT 'local',     -- local/google/facebook/apple
  role TEXT DEFAULT 'customer',           -- customer/admin/delivery
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `products`

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,                    -- UUID v4
  sku TEXT UNIQUE NOT NULL,               -- Référence produit (SKU parent)
  name TEXT NOT NULL,                     -- Nom du produit
  slug TEXT UNIQUE NOT NULL,              -- URL-friendly name
  description TEXT,                       -- Description longue
  base_price INTEGER NOT NULL,            -- Prix de base (prix minimum si variantes)
  compare_price INTEGER,                  -- Prix barré (promotions)
  has_variants BOOLEAN DEFAULT false,     -- Produit avec variantes ?
  category_id TEXT REFERENCES categories(id),
  brand TEXT,                             -- Marque
  stock_quantity INTEGER DEFAULT 0,       -- Stock total (somme variantes ou stock simple)
  low_stock_threshold INTEGER DEFAULT 5,  -- Seuil alerte stock
  is_active BOOLEAN DEFAULT true,         -- Publié ou non
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `product_variants`

Gère les variantes de produits (couleur, capacité, taille) avec prix et stock individuels.

```sql
CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,                    -- UUID v4
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,               -- SKU unique de la variante
  name TEXT NOT NULL,                     -- Ex: "256 Go - Titane Noir"
  
  -- Attributs de la variante (flexible via JSON ou colonnes)
  color TEXT,                             -- Couleur (optionnel)
  color_hex TEXT,                         -- Code hex pour affichage
  capacity TEXT,                          -- Capacité/Taille (optionnel)
  
  price INTEGER NOT NULL,                 -- Prix de cette variante
  compare_price INTEGER,                  -- Prix barré de cette variante
  stock_quantity INTEGER DEFAULT 0,       -- Stock de cette variante
  
  image_url TEXT,                         -- Image spécifique à la variante
  sort_order INTEGER DEFAULT 0,           -- Ordre d'affichage
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_color ON product_variants(color);
```

**Exemples de variantes :**

| product_id | sku | name | color | capacity | price |
|------------|-----|------|-------|----------|-------|
| iphone-15-pro | IPH15P-256-BLK | 256 Go - Noir | Noir | 256 Go | 850 000 |
| iphone-15-pro | IPH15P-256-NAT | 256 Go - Naturel | Naturel | 256 Go | 850 000 |
| iphone-15-pro | IPH15P-512-BLK | 512 Go - Noir | Noir | 512 Go | 1 050 000 |
| iphone-15-pro | IPH15P-1TB-BLK | 1 To - Noir | Noir | 1 To | 1 250 000 |

**Logique d'affichage prix :**
- Si `has_variants = false` → Afficher `base_price`
- Si `has_variants = true` → Afficher "À partir de {base_price}"
- `base_price` doit toujours être le prix minimum parmi les variantes

#### Table: `categories`

```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id TEXT REFERENCES categories(id),
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);
```

#### Table: `product_images`

```sql
CREATE TABLE product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,                      -- URL R2
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false
);
```

#### Table: `product_attributes`

```sql
CREATE TABLE product_attributes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                     -- Ex: "Couleur", "Capacité"
  value TEXT NOT NULL                     -- Ex: "Noir", "128 Go"
);
```

#### Table: `orders`

```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,      -- Format: ORD-XXXXXX
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending/confirmed/preparing/delivering/delivered/cancelled
  subtotal INTEGER NOT NULL,              -- Sous-total en XOF
  discount_amount INTEGER DEFAULT 0,      -- Réduction appliquée
  delivery_fee INTEGER NOT NULL,          -- Frais de livraison
  total INTEGER NOT NULL,                 -- Total à payer
  promo_code_id TEXT REFERENCES promo_codes(id),
  delivery_address TEXT NOT NULL,         -- JSON: {street, city, zone, instructions}
  delivery_person_id TEXT REFERENCES users(id),
  notes TEXT,                             -- Instructions client
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME,
  delivered_at DATETIME
);
```

#### Table: `order_items`

```sql
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,             -- Snapshot du nom
  product_sku TEXT NOT NULL,              -- Snapshot du SKU
  unit_price INTEGER NOT NULL,            -- Prix unitaire au moment de l'achat
  quantity INTEGER NOT NULL,
  total INTEGER NOT NULL                  -- unit_price * quantity
);
```

#### Table: `promo_codes`

```sql
CREATE TABLE promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,              -- Ex: PROMO2026
  type TEXT NOT NULL,                     -- percentage/fixed
  value INTEGER NOT NULL,                 -- Valeur (% ou montant XOF)
  min_order_amount INTEGER,               -- Minimum commande
  max_discount INTEGER,                   -- Réduction max (pour %)
  max_uses INTEGER,                       -- Nombre max utilisations
  used_count INTEGER DEFAULT 0,           -- Utilisations actuelles
  valid_from DATETIME,
  valid_until DATETIME,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `reviews`

```sql
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `addresses`

```sql
CREATE TABLE addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT,                             -- Ex: "Maison", "Bureau"
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  zone TEXT NOT NULL,                     -- Zone de livraison
  instructions TEXT,                      -- Instructions livreur
  is_default BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `delivery_zones`

```sql
CREATE TABLE delivery_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                     -- Ex: "Abidjan - Cocody"
  city TEXT NOT NULL,
  fee INTEGER NOT NULL,                   -- Frais en XOF
  estimated_days INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true
);
```

### 5.2 Index Recommandés

```sql
-- Performance des recherches produits
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_slug ON products(slug);

-- Performance des commandes
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Performance des avis
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_approved ON reviews(is_approved);
```

---

## 6. APIs et Endpoints

### 6.1 API Publique (Storefront)

#### Produits

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/products` | Liste produits (pagination, filtres) |
| GET | `/api/products/:slug` | Détail produit par slug |
| GET | `/api/products/search` | Recherche avec query et filtres |
| GET | `/api/products/featured` | Produits vedettes |
| GET | `/api/categories` | Arborescence catégories |
| GET | `/api/categories/:slug/products` | Produits d'une catégorie |
| GET | `/api/products/:id/reviews` | Avis d'un produit |

**Exemple de requête avec filtres :**

```
GET /api/products?category=smartphones&brand=samsung&min_price=100000&max_price=500000&sort=price_asc&page=1&limit=20
```

#### Panier

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/cart` | Récupérer le panier |
| POST | `/api/cart/items` | Ajouter au panier |
| PATCH | `/api/cart/items/:id` | Modifier quantité |
| DELETE | `/api/cart/items/:id` | Retirer du panier |
| DELETE | `/api/cart` | Vider le panier |
| POST | `/api/cart/promo` | Appliquer code promo |
| DELETE | `/api/cart/promo` | Retirer code promo |

#### Commandes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/orders` | Créer commande |
| GET | `/api/orders` | Historique commandes (auth) |
| GET | `/api/orders/:id` | Détail commande (auth) |
| GET | `/api/orders/:id/track` | Suivi livraison |
| POST | `/api/orders/:id/cancel` | Annuler commande (si pending) |

#### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Inscription email/password |
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Profil utilisateur connecté |
| PATCH | `/api/auth/me` | Modifier profil |
| POST | `/api/auth/oauth/:provider` | OAuth (google/facebook/apple) |
| GET | `/api/auth/oauth/:provider/callback` | Callback OAuth |
| POST | `/api/auth/forgot-password` | Demande reset password |
| POST | `/api/auth/reset-password` | Nouveau mot de passe |

#### Compte Utilisateur

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/account/addresses` | Liste des adresses |
| POST | `/api/account/addresses` | Ajouter adresse |
| PATCH | `/api/account/addresses/:id` | Modifier adresse |
| DELETE | `/api/account/addresses/:id` | Supprimer adresse |
| GET | `/api/account/wishlist` | Liste de souhaits |
| POST | `/api/account/wishlist/:productId` | Ajouter à wishlist |
| DELETE | `/api/account/wishlist/:productId` | Retirer de wishlist |
| POST | `/api/products/:id/reviews` | Poster un avis (auth) |

#### Livraison

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/delivery/zones` | Zones de livraison disponibles |
| GET | `/api/delivery/estimate` | Estimation frais par zone |

### 6.2 API Admin (Back-Office)

> **Note :** Tous les endpoints admin requièrent `role: admin`

#### Gestion Produits

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/products` | Liste tous produits |
| POST | `/api/admin/products` | Créer produit |
| GET | `/api/admin/products/:id` | Détail produit |
| PATCH | `/api/admin/products/:id` | Modifier produit |
| DELETE | `/api/admin/products/:id` | Supprimer produit |
| POST | `/api/admin/products/:id/images` | Upload images |
| DELETE | `/api/admin/products/:id/images/:imageId` | Supprimer image |
| POST | `/api/admin/products/import` | Import CSV |
| GET | `/api/admin/products/export` | Export CSV |

#### Gestion Catégories

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/categories` | Liste catégories |
| POST | `/api/admin/categories` | Créer catégorie |
| PATCH | `/api/admin/categories/:id` | Modifier catégorie |
| DELETE | `/api/admin/categories/:id` | Supprimer catégorie |

#### Gestion Commandes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/orders` | Liste commandes (filtres) |
| GET | `/api/admin/orders/:id` | Détail commande |
| PATCH | `/api/admin/orders/:id/status` | Changer statut |
| PATCH | `/api/admin/orders/:id/assign` | Assigner livreur |
| GET | `/api/admin/orders/:id/invoice` | Générer facture PDF |

#### Gestion Clients

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/customers` | Liste clients |
| GET | `/api/admin/customers/:id` | Détail client |
| GET | `/api/admin/customers/:id/orders` | Commandes d'un client |

#### Gestion Promotions

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/promo-codes` | Liste codes promo |
| POST | `/api/admin/promo-codes` | Créer code promo |
| PATCH | `/api/admin/promo-codes/:id` | Modifier code promo |
| DELETE | `/api/admin/promo-codes/:id` | Supprimer code promo |

#### Gestion Avis

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/reviews` | Liste avis (pending) |
| PATCH | `/api/admin/reviews/:id/approve` | Approuver avis |
| DELETE | `/api/admin/reviews/:id` | Supprimer avis |

#### Analytics & Rapports

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/dashboard` | KPIs dashboard |
| GET | `/api/admin/reports/sales` | Rapport ventes |
| GET | `/api/admin/reports/products` | Produits les plus vendus |
| GET | `/api/admin/reports/stock` | État des stocks |

#### Gestion Livreurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/delivery-persons` | Liste livreurs |
| POST | `/api/admin/delivery-persons` | Ajouter livreur |
| PATCH | `/api/admin/delivery-persons/:id` | Modifier livreur |
| GET | `/api/admin/delivery-persons/:id/orders` | Commandes assignées |

---

## 7. Sécurité et Authentification

### 7.1 Stratégie d'Authentification

| Méthode | Implémentation |
|---------|----------------|
| Sessions | JWT stocké en cookie HttpOnly, Secure, SameSite=Strict |
| Durée session | 7 jours avec refresh token |
| Password hashing | bcrypt avec cost factor 12 |
| OAuth 2.0 | PKCE flow pour Google, Facebook, Apple |
| Rate limiting | 100 req/min par IP sur `/api/auth/*` |

### 7.2 Flux OAuth Simplifié

```
1. Client      → Clic "Se connecter avec Google"
2. App         → Redirect vers Google OAuth avec PKCE
3. User        → Autorise l'application
4. Google      → Callback avec authorization code
5. Worker      → Échange code contre tokens
6. Worker      → Récupère profil utilisateur
7. Worker      → Crée/update user en D1
8. Worker      → Crée session JWT, set cookie
9. Client      → Redirect vers dashboard
```

### 7.3 Configuration OAuth

#### Google

```typescript
// Configuration requise dans Google Cloud Console
const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: 'https://votresite.ci/api/auth/oauth/google/callback',
  scopes: ['openid', 'email', 'profile']
};
```

#### Facebook

```typescript
const facebookConfig = {
  appId: process.env.FACEBOOK_APP_ID,
  appSecret: process.env.FACEBOOK_APP_SECRET,
  redirectUri: 'https://votresite.ci/api/auth/oauth/facebook/callback',
  scopes: ['email', 'public_profile']
};
```

#### Apple

```typescript
const appleConfig = {
  clientId: process.env.APPLE_CLIENT_ID,
  teamId: process.env.APPLE_TEAM_ID,
  keyId: process.env.APPLE_KEY_ID,
  privateKey: process.env.APPLE_PRIVATE_KEY,
  redirectUri: 'https://votresite.ci/api/auth/oauth/apple/callback'
};
```

### 7.4 Protection Cloudflare

| Protection | Configuration |
|------------|---------------|
| WAF | Règles OWASP activées, protection SQL injection, XSS |
| DDoS | Protection automatique L3/L4/L7 |
| Bot Management | Challenge pour bots suspects (Pro plan) |
| SSL/TLS | Full (strict) avec certificat Origin CA |
| HSTS | Activé avec preload |
| CSP | Content Security Policy stricte |

### 7.5 Headers de Sécurité

```typescript
// Middleware de sécurité
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' https://r2.votresite.ci; script-src 'self' 'unsafe-inline'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
```

---

## 8. Intégrations Externes

### 8.1 Notifications Email (Resend)

| Email | Déclencheur |
|-------|-------------|
| Bienvenue | Création de compte |
| Confirmation commande | Nouvelle commande validée |
| Commande confirmée | Admin confirme la commande |
| En préparation | Statut → preparing |
| En cours de livraison | Statut → delivering (+ infos livreur) |
| Commande livrée | Statut → delivered |
| Réinitialisation MDP | Demande de reset password |
| Stock faible (admin) | Stock < seuil d'alerte |

#### Exemple d'intégration Resend

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOrderConfirmation(order: Order, user: User) {
  await resend.emails.send({
    from: 'commandes@votresite.ci',
    to: user.email,
    subject: `Confirmation de commande #${order.order_number}`,
    html: renderOrderConfirmationEmail(order)
  });
}
```

### 8.2 Notifications WhatsApp

| Message | Contenu |
|---------|---------|
| Confirmation commande | Numéro, récapitulatif, montant total |
| Expédition | Nom du livreur, téléphone, estimation |
| Livré | Confirmation + invitation à laisser un avis |

> **Configuration WhatsApp :** Utiliser l'API Cloud de Meta (WhatsApp Business) ou Twilio. Nécessite un compte Business vérifié et des templates de messages pré-approuvés.

#### Exemple d'intégration WhatsApp (Meta Cloud API)

```typescript
async function sendWhatsAppNotification(phone: string, templateName: string, params: object) {
  const response = await fetch(
    `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'fr' },
          components: [{ type: 'body', parameters: params }]
        }
      })
    }
  );
  return response.json();
}
```

### 8.3 Architecture des Queues

Les notifications sont traitées de manière asynchrone via Cloudflare Queues :

| Queue | Traitement |
|-------|------------|
| `email-notifications` | Envoi emails via Resend API |
| `whatsapp-notifications` | Envoi messages via WhatsApp API |
| `image-processing` | Optimisation images uploadées (resize, webp) |
| `stock-alerts` | Vérification seuils et alertes admin |

```typescript
// Producer (dans l'API)
await env.NOTIFICATIONS_QUEUE.send({
  type: 'order_confirmation',
  orderId: order.id,
  channels: ['email', 'whatsapp']
});

// Consumer (Queue handler)
export default {
  async queue(batch: MessageBatch, env: Env) {
    for (const message of batch.messages) {
      const { type, orderId, channels } = message.body;
      
      if (channels.includes('email')) {
        await sendOrderEmail(orderId, env);
      }
      if (channels.includes('whatsapp')) {
        await sendWhatsAppMessage(orderId, env);
      }
      
      message.ack();
    }
  }
};
```

---

## 9. Stratégie SEO E-Commerce

### 9.1 Vue d'Ensemble SEO

Le SEO est crucial pour votre boutique : il représentera la majorité de votre trafic qualifié et gratuit. Voici une stratégie complète adaptée au marché ivoirien avec une vision d'expansion UEMOA.

#### Objectifs SEO

| Objectif | Indicateur | Cible |
|----------|------------|-------|
| Visibilité locale | Positions Google.ci | Top 3 sur mots-clés produits |
| Trafic organique | Visiteurs/mois | 60-70% du trafic total |
| Core Web Vitals | Score Lighthouse | > 90 sur mobile |
| Indexation | Pages indexées | 100% des produits actifs |

#### Zones géographiques cibles

| Phase | Pays | Domaine/Stratégie |
|-------|------|-------------------|
| Lancement | Côte d'Ivoire | votresite.ci (principal) |
| Extension | UEMOA (Sénégal, Mali, Burkina...) | Sous-domaines ou hreflang |

### 9.2 Architecture SEO-Friendly

#### Structure des URLs

```
# Homepage
https://www.votresite.ci/

# Catégories (2 niveaux max recommandé)
https://www.votresite.ci/smartphones/
https://www.votresite.ci/smartphones/samsung/
https://www.votresite.ci/ordinateurs/portables/

# Produits (toujours avec le slug descriptif)
https://www.votresite.ci/p/iphone-15-pro-max-256go-noir
https://www.votresite.ci/p/samsung-galaxy-s24-ultra-512go

# Pages statiques
https://www.votresite.ci/a-propos
https://www.votresite.ci/contact
https://www.votresite.ci/livraison
https://www.votresite.ci/conditions-generales
```

> **💡 Bonnes pratiques URLs :**
> - Toujours en minuscules, avec tirets (pas d'underscores)
> - Inclure les mots-clés principaux (marque, modèle, capacité)
> - Éviter les paramètres URL pour le contenu principal
> - Maximum 3-4 niveaux de profondeur

#### Configuration Next.js 16 - Métadonnées

```typescript
// src/app/layout.tsx - Métadonnées globales
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.votresite.ci"),
  title: {
    default: "VotreSite - Électronique & High-Tech en Côte d'Ivoire",
    template: "%s | VotreSite.ci",
  },
  description:
    "Achetez smartphones, ordinateurs, consoles et TV en Côte d'Ivoire. Livraison rapide à Abidjan et partout en CI. Paiement à la livraison.",
  keywords: [
    "électronique Côte d'Ivoire",
    "smartphone Abidjan",
    "ordinateur portable CI",
    "acheter iPhone Abidjan",
    "Samsung Galaxy Côte d'Ivoire",
  ],
  authors: [{ name: "VotreSite" }],
  creator: "VotreSite",
  publisher: "VotreSite",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "fr_CI",
    url: "https://www.votresite.ci",
    siteName: "VotreSite - Électronique Côte d'Ivoire",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "VotreSite - Votre boutique électronique en Côte d'Ivoire",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@votresite",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "votre-code-verification-google",
  },
  alternates: {
    canonical: "https://www.votresite.ci",
    languages: {
      "fr-CI": "https://www.votresite.ci",
      // Pour plus tard
      // "en": "https://www.votresite.ci/en",
    },
  },
};
```

#### Métadonnées dynamiques par page produit

```typescript
// src/app/(storefront)/p/[slug]/page.tsx
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/db/products";
import { formatPrice } from "@/lib/utils/format";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Produit non trouvé",
    };
  }

  const price = formatPrice(product.price); // Ex: "450 000 FCFA"
  
  return {
    title: `${product.name} - ${price}`,
    description: `Achetez ${product.name} en Côte d'Ivoire. ${product.description?.slice(0, 120)}... Livraison rapide à Abidjan. Paiement à la livraison.`,
    keywords: [
      product.name,
      product.brand,
      `${product.brand} Côte d'Ivoire`,
      `acheter ${product.name} Abidjan`,
      product.category,
    ],
    openGraph: {
      title: `${product.name} - ${price} | VotreSite.ci`,
      description: product.description,
      url: `https://www.votresite.ci/p/${slug}`,
      siteName: "VotreSite.ci",
      images: product.images.map((img) => ({
        url: img.url,
        width: 800,
        height: 800,
        alt: img.alt_text || product.name,
      })),
      locale: "fr_CI",
      type: "website", // Ou "product" selon OG
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} - ${price}`,
      description: product.description?.slice(0, 200),
      images: [product.images[0]?.url],
    },
    alternates: {
      canonical: `https://www.votresite.ci/p/${slug}`,
    },
  };
}
```

### 9.3 Données Structurées (Schema.org)

Les données structurées permettent d'afficher des **rich snippets** dans Google (prix, avis, disponibilité). C'est crucial pour le e-commerce.

#### Composant JSON-LD réutilisable

```typescript
// src/components/seo/json-ld.tsx
type JsonLdProps = {
  data: Record<string, unknown>;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

#### Schema Product (Page produit)

```typescript
// src/app/(storefront)/p/[slug]/page.tsx
import { JsonLd } from "@/components/seo/json-ld";

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const reviews = await getProductReviews(product.id);

  // Calcul note moyenne
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((img) => img.url),
    description: product.description,
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    offers: {
      "@type": "Offer",
      url: `https://www.votresite.ci/p/${slug}`,
      priceCurrency: "XOF",
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      availability: product.stock_quantity > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "VotreSite",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "CI",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 3,
            unitCode: "DAY",
          },
        },
      },
    },
    // Avis (si disponibles)
    ...(avgRating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating.toFixed(1),
        reviewCount: reviews.length,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    // Avis individuels
    ...(reviews.length && {
      review: reviews.slice(0, 5).map((review) => ({
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: review.rating,
          bestRating: 5,
        },
        author: {
          "@type": "Person",
          name: review.user_name,
        },
        reviewBody: review.comment,
        datePublished: review.created_at,
      })),
    }),
  };

  return (
    <>
      <JsonLd data={productSchema} />
      {/* Contenu de la page */}
    </>
  );
}
```

#### Schema Organization (Layout global)

```typescript
// src/app/layout.tsx
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VotreSite",
  url: "https://www.votresite.ci",
  logo: "https://www.votresite.ci/logo.png",
  description: "Boutique en ligne d'électronique en Côte d'Ivoire",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Votre adresse",
    addressLocality: "Abidjan",
    addressRegion: "Abidjan",
    addressCountry: "CI",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+225-XX-XX-XX-XX",
    contactType: "customer service",
    availableLanguage: "French",
  },
  sameAs: [
    "https://www.facebook.com/votresite",
    "https://www.instagram.com/votresite",
    "https://twitter.com/votresite",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "VotreSite",
  url: "https://www.votresite.ci",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://www.votresite.ci/recherche?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};
```

#### Schema BreadcrumbList (Fil d'Ariane)

```typescript
// src/components/seo/breadcrumb-schema.tsx
type BreadcrumbItem = {
  name: string;
  url: string;
};

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={schema} />;
}

// Utilisation sur une page produit
<BreadcrumbSchema
  items={[
    { name: "Accueil", url: "https://www.votresite.ci" },
    { name: "Smartphones", url: "https://www.votresite.ci/smartphones" },
    { name: "Samsung", url: "https://www.votresite.ci/smartphones/samsung" },
    { name: product.name, url: `https://www.votresite.ci/p/${product.slug}` },
  ]}
/>
```

### 9.4 Sitemap XML Dynamique

```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getEnv } from "@/lib/cloudflare/context";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { DB } = await getEnv();
  const baseUrl = "https://www.votresite.ci";

  // Pages statiques
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/a-propos`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/livraison`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Catégories
  const { results: categories } = await DB.prepare(`
    SELECT slug, updated_at FROM categories WHERE is_active = 1
  `).all();

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/${cat.slug}`,
    lastModified: new Date(cat.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Produits
  const { results: products } = await DB.prepare(`
    SELECT slug, updated_at FROM products WHERE is_active = 1
  `).all();

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/p/${product.slug}`,
    lastModified: new Date(product.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
```

### 9.5 Robots.txt

```typescript
// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/account/",
          "/checkout/",
          "/cart/",
          "/auth/",
          "/*?*sort=",      // Éviter indexation des tris
          "/*?*filter=",    // Éviter indexation des filtres
          "/*?*page=",      // Géré par canonical
        ],
      },
    ],
    sitemap: "https://www.votresite.ci/sitemap.xml",
  };
}
```

### 9.6 Gestion SEO des Filtres et Pagination

Les filtres et la pagination peuvent créer du **contenu dupliqué**. Voici comment les gérer :

#### Pagination avec balises canoniques

```typescript
// src/app/(storefront)/[category]/page.tsx
import type { Metadata } from "next";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category } = await params;
  const { page, sort } = await searchParams;
  const currentPage = parseInt(page || "1");

  // Canonical pointe toujours vers la page sans paramètres de tri
  // mais garde la pagination
  const canonicalUrl = currentPage > 1
    ? `https://www.votresite.ci/${category}?page=${currentPage}`
    : `https://www.votresite.ci/${category}`;

  return {
    title: `${categoryName} - Page ${currentPage}`,
    alternates: {
      canonical: canonicalUrl,
    },
    // Pas d'indexation pour les pages avec tri
    ...(sort && {
      robots: {
        index: false,
        follow: true,
      },
    }),
  };
}
```

#### Liens pagination SEO-friendly

```typescript
// src/components/storefront/pagination.tsx
import Link from "next/link";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
};

export function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  return (
    <nav aria-label="Pagination">
      {currentPage > 1 && (
        <Link
          href={currentPage === 2 ? baseUrl : `${baseUrl}?page=${currentPage - 1}`}
          rel="prev"
        >
          Précédent
        </Link>
      )}
      
      {/* Numéros de page */}
      
      {currentPage < totalPages && (
        <Link
          href={`${baseUrl}?page=${currentPage + 1}`}
          rel="next"
        >
          Suivant
        </Link>
      )}
    </nav>
  );
}
```

### 9.7 Performance SEO (Core Web Vitals)

Google utilise les Core Web Vitals comme facteur de classement. Voici les optimisations intégrées :

#### Optimisation des images

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
};
```

```typescript
// Utilisation optimisée des images
import Image from "next/image";

<Image
  src={product.images[0].url}
  alt={product.name}
  width={400}
  height={400}
  priority={isAboveFold} // true pour les images visibles immédiatement
  loading={isAboveFold ? "eager" : "lazy"}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
/>
```

#### Cibles Core Web Vitals

| Métrique | Cible | Description |
|----------|-------|-------------|
| LCP (Largest Contentful Paint) | < 2.5s | Temps d'affichage du plus grand élément |
| INP (Interaction to Next Paint) | < 200ms | Réactivité aux interactions |
| CLS (Cumulative Layout Shift) | < 0.1 | Stabilité visuelle |

### 9.8 SEO Local pour la Côte d'Ivoire

#### Configuration Google Business Profile

1. Créer une fiche Google Business Profile
2. Catégorie : "Magasin d'électronique" 
3. Zone de service : Abidjan + principales villes CI
4. Ajouter photos, horaires, numéro WhatsApp

#### Mots-clés locaux à cibler

| Catégorie | Mots-clés prioritaires |
|-----------|------------------------|
| Génériques | "électronique Côte d'Ivoire", "high-tech Abidjan" |
| Smartphones | "iPhone Abidjan", "Samsung Galaxy CI", "acheter téléphone Côte d'Ivoire" |
| Ordinateurs | "ordinateur portable Abidjan", "PC gamer Côte d'Ivoire" |
| Consoles | "PS5 Côte d'Ivoire", "Xbox Abidjan", "Nintendo Switch CI" |
| TV | "télévision Abidjan", "Smart TV Côte d'Ivoire" |

#### Schema LocalBusiness

```typescript
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ElectronicsStore",
  name: "VotreSite",
  image: "https://www.votresite.ci/storefront.jpg",
  "@id": "https://www.votresite.ci",
  url: "https://www.votresite.ci",
  telephone: "+225-XX-XX-XX-XX",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Votre adresse",
    addressLocality: "Abidjan",
    addressRegion: "Lagunes",
    postalCode: "",
    addressCountry: "CI",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 5.3599517,  // Coordonnées Abidjan
    longitude: -4.0082563,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "09:00",
      closes: "15:00",
    },
  ],
  priceRange: "$$",
  currenciesAccepted: "XOF",
  paymentAccepted: "Cash",
  areaServed: {
    "@type": "Country",
    name: "Côte d'Ivoire",
  },
};
```

### 9.9 Préparation Multi-langue (UEMOA)

Pour l'expansion future vers l'UEMOA, préparez la structure i18n :

```typescript
// Structure de fichiers prête pour i18n
src/
├── app/
│   ├── [locale]/              # Route dynamique par langue
│   │   ├── (storefront)/
│   │   └── layout.tsx
│   └── ...
├── i18n/
│   ├── config.ts
│   ├── dictionaries/
│   │   ├── fr.json
│   │   └── en.json            # Pour plus tard
│   └── get-dictionary.ts
```

```typescript
// src/i18n/config.ts
export const locales = ["fr"] as const; // Ajouter "en" plus tard
export const defaultLocale = "fr";

export type Locale = (typeof locales)[number];

// Configuration hreflang (pour plus tard)
export const localeConfig = {
  fr: {
    name: "Français",
    region: "CI", // Côte d'Ivoire par défaut
    currency: "XOF",
  },
  // en: {
  //   name: "English",
  //   region: "CI",
  //   currency: "XOF",
  // },
};
```

### 9.10 Checklist SEO

#### Avant lancement
- [ ] Google Search Console configuré
- [ ] Google Analytics 4 installé
- [ ] Sitemap.xml généré et soumis
- [ ] Robots.txt vérifié
- [ ] Métadonnées sur toutes les pages
- [ ] Données structurées Product sur fiches produits
- [ ] Images optimisées (WebP/AVIF, alt text)
- [ ] URLs canoniques définies
- [ ] Core Web Vitals > 90 mobile
- [ ] HTTPS actif
- [ ] Mobile-friendly vérifié

#### Post-lancement
- [ ] Google Business Profile créé
- [ ] Suivi des positions (Semrush, Ahrefs ou gratuit)
- [ ] Monitoring erreurs 404
- [ ] Analyse des requêtes Search Console
- [ ] Optimisation continue des fiches produits

### 9.11 Outils SEO Recommandés

| Outil | Usage | Coût |
|-------|-------|------|
| Google Search Console | Monitoring indexation, requêtes | Gratuit |
| Google Analytics 4 | Trafic, conversions | Gratuit |
| PageSpeed Insights | Core Web Vitals | Gratuit |
| Lighthouse | Audit complet | Gratuit |
| Schema Markup Validator | Validation données structurées | Gratuit |
| Screaming Frog | Audit technique (< 500 URLs) | Gratuit |
| Ubersuggest | Recherche mots-clés | Freemium |

---

## 10. Structure du Projet

```
ecommerce-ci/
├── src/
│   ├── app/                          # Next.js 16 App Router
│   │   ├── (storefront)/             # Routes client (public)
│   │   │   ├── page.tsx              # Homepage
│   │   │   ├── products/
│   │   │   │   ├── page.tsx          # Liste produits
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # Détail produit (async params)
│   │   │   ├── categories/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # Produits par catégorie
│   │   │   ├── cart/
│   │   │   │   └── page.tsx          # Panier
│   │   │   ├── checkout/
│   │   │   │   └── page.tsx          # Checkout
│   │   │   ├── account/
│   │   │   │   ├── page.tsx          # Dashboard compte
│   │   │   │   ├── orders/
│   │   │   │   ├── addresses/
│   │   │   │   └── wishlist/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── forgot-password/
│   │   │   └── layout.tsx            # Layout storefront
│   │   │
│   │   ├── (admin)/                  # Routes admin (protégées)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # Dashboard admin
│   │   │   ├── products/
│   │   │   │   ├── page.tsx          # Liste produits
│   │   │   │   ├── new/
│   │   │   │   └── [id]/edit/
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx          # Liste commandes
│   │   │   │   └── [id]/
│   │   │   ├── customers/
│   │   │   ├── promo-codes/
│   │   │   ├── categories/
│   │   │   ├── reviews/
│   │   │   ├── reports/
│   │   │   └── layout.tsx            # Layout admin
│   │   │
│   │   ├── api/                      # API Routes (Server Actions préférées)
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   ├── webhooks/
│   │   │   │   └── whatsapp/
│   │   │   └── cron/
│   │   │       └── stock-alerts/
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css
│   │   └── not-found.tsx
│   │
│   ├── actions/                      # Server Actions (Next.js 16)
│   │   ├── products.ts               # Actions CRUD produits
│   │   ├── cart.ts                   # Actions panier
│   │   ├── orders.ts                 # Actions commandes
│   │   ├── auth.ts                   # Actions authentification
│   │   └── admin/
│   │       ├── products.ts
│   │       ├── orders.ts
│   │       └── customers.ts
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── storefront/               # Composants boutique
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── product-card.tsx
│   │   │   ├── product-gallery.tsx
│   │   │   ├── cart-drawer.tsx
│   │   │   ├── search-bar.tsx
│   │   │   ├── filters-sidebar.tsx
│   │   │   └── ...
│   │   ├── admin/                    # Composants admin
│   │   │   ├── sidebar.tsx
│   │   │   ├── data-table.tsx
│   │   │   ├── stats-card.tsx
│   │   │   ├── order-status-badge.tsx
│   │   │   └── ...
│   │   └── shared/                   # Composants partagés
│   │       ├── loading.tsx
│   │       ├── error-boundary.tsx
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── db/                       # Queries D1
│   │   │   ├── index.ts              # Client D1
│   │   │   ├── products.ts
│   │   │   ├── orders.ts
│   │   │   ├── users.ts
│   │   │   └── ...
│   │   ├── auth/                     # Auth helpers
│   │   │   ├── session.ts
│   │   │   ├── oauth.ts
│   │   │   └── password.ts
│   │   ├── storage/                  # R2 helpers
│   │   │   └── images.ts
│   │   ├── notifications/            # Email/WhatsApp
│   │   │   ├── email.ts
│   │   │   └── whatsapp.ts
│   │   ├── cloudflare/               # Bindings Cloudflare
│   │   │   └── context.ts            # getCloudflareContext helper
│   │   ├── utils/
│   │   │   ├── format.ts             # Formatage prix, dates
│   │   │   ├── validation.ts         # Schemas Zod
│   │   │   └── constants.ts
│   │   └── hooks/                    # Custom React hooks
│   │       ├── use-cart.ts
│   │       ├── use-auth.ts
│   │       └── ...
│   │
│   ├── stores/                       # Zustand stores
│   │   ├── cart-store.ts
│   │   └── ui-store.ts
│   │
│   └── types/                        # TypeScript types
│       ├── product.ts
│       ├── order.ts
│       ├── user.ts
│       └── index.ts
│
├── db/
│   ├── schema.sql                    # Schéma D1 complet
│   ├── migrations/                   # Migrations D1
│   │   ├── 0001_initial.sql
│   │   └── ...
│   └── seeds/                        # Données initiales
│       ├── categories.sql
│       ├── products.sql
│       └── delivery-zones.sql
│
├── public/
│   ├── images/
│   ├── fonts/
│   └── _headers                      # Headers Cloudflare
│
├── workers/
│   └── queue-consumer.ts             # Consumer pour Queues
│
├── .open-next/                       # Build output (gitignore)
├── open-next.config.ts               # Config OpenNext
├── wrangler.toml                     # Config Cloudflare Workers
├── cloudflare-env.d.ts               # Types Cloudflare (généré)
├── next.config.ts                    # Config Next.js 16
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── proxy.ts                          # Remplace middleware.ts (Next.js 16)
└── README.md
```

### 10.1 Exemple de Server Action (Next.js 16)

```typescript
// src/actions/cart.ts
"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const AddToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().min(1).max(10),
});

export async function addToCart(formData: FormData) {
  const { env } = await getCloudflareContext();
  
  const validated = AddToCartSchema.parse({
    productId: formData.get("productId"),
    quantity: Number(formData.get("quantity")),
  });

  // Récupérer le produit depuis D1
  const product = await env.DB.prepare(
    "SELECT * FROM products WHERE id = ? AND is_active = 1"
  )
    .bind(validated.productId)
    .first();

  if (!product) {
    return { error: "Produit non trouvé" };
  }

  if (product.stock_quantity < validated.quantity) {
    return { error: "Stock insuffisant" };
  }

  // Ajouter au panier (KV)
  const cartKey = `cart:${getUserId()}`;
  const cart = await env.SESSION_KV.get(cartKey, "json") || { items: [] };
  
  // ... logique d'ajout au panier

  await env.SESSION_KV.put(cartKey, JSON.stringify(cart), {
    expirationTtl: 60 * 60 * 24 * 7, // 7 jours
  });

  revalidatePath("/cart");
  return { success: true, cart };
}
```

### 10.2 Accès aux Bindings Cloudflare

```typescript
// src/lib/cloudflare/context.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Types pour les bindings
interface CloudflareEnv {
  DB: D1Database;
  CACHE_KV: KVNamespace;
  SESSION_KV: KVNamespace;
  ASSETS_BUCKET: R2Bucket;
  NOTIFICATIONS_QUEUE: Queue;
}

export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext();
  return env as CloudflareEnv;
}

// Exemple d'utilisation dans un Server Component
export async function getProducts() {
  const { DB } = await getEnv();
  
  const { results } = await DB.prepare(`
    SELECT * FROM products 
    WHERE is_active = 1 
    ORDER BY created_at DESC 
    LIMIT 20
  `).all();
  
  return results;
}
```

---

## 11. Plan de Déploiement

### 11.1 Environnements

| Environnement | URL | Usage |
|---------------|-----|-------|
| Development | `localhost:3000` | Développement local |
| Preview | `preview.votresite.ci` | Preview par PR (automatique) |
| Staging | `staging.votresite.ci` | Tests et validation |
| Production | `www.votresite.ci` | Site public |

### 11.2 Configuration OpenNext

#### Création du projet

```bash
# Méthode recommandée : création avec template Cloudflare
npm create cloudflare@latest -- ecommerce-ci --framework=next --platform=workers

# OU ajout à un projet Next.js existant
npm install @opennextjs/cloudflare
```

#### Configuration `open-next.config.ts`

```typescript
// open-next.config.ts
import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  // Configuration du cache
  cache: {
    // Utiliser KV pour le cache ISR
    regional: {
      type: "cloudflare-kv",
      binding: "CACHE_KV",
    },
  },
  // Configuration des assets
  assets: {
    // R2 pour les assets statiques
    type: "cloudflare-r2",
    binding: "ASSETS_BUCKET",
  },
};

export default config;
```

#### Configuration `wrangler.toml`

```toml
# wrangler.toml

name = "ecommerce-ci"
main = ".open-next/worker.js"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

# Assets statiques
[assets]
directory = ".open-next/assets"

# Base de données D1
[[d1_databases]]
binding = "DB"
database_name = "ecommerce-db"
database_id = "xxxxx-xxxxx-xxxxx"

# Cache KV pour ISR
[[kv_namespaces]]
binding = "CACHE_KV"
id = "xxxxx-xxxxx-xxxxx"

# Cache KV pour sessions
[[kv_namespaces]]
binding = "SESSION_KV"
id = "xxxxx-xxxxx-xxxxx"

# Stockage R2
[[r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "ecommerce-assets"

# Queue notifications
[[queues.producers]]
binding = "NOTIFICATIONS_QUEUE"
queue = "notifications"

[[queues.consumers]]
queue = "notifications"
max_batch_size = 10
max_batch_timeout = 30

# Variables d'environnement
[vars]
SITE_URL = "https://www.votresite.ci"
CURRENCY = "XOF"
NODE_ENV = "production"

# Secrets (à définir via wrangler secret put)
# JWT_SECRET
# GOOGLE_CLIENT_ID
# GOOGLE_CLIENT_SECRET
# FACEBOOK_APP_ID
# FACEBOOK_APP_SECRET
# APPLE_CLIENT_ID
# RESEND_API_KEY
# WHATSAPP_TOKEN
```

#### Configuration `next.config.ts` (Next.js 16)

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack est maintenant au niveau racine (Next.js 16)
  turbopack: {
    // Options Turbopack si nécessaire
  },
  
  // Configuration des images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
    // Formats optimisés
    formats: ["image/avif", "image/webp"],
  },
  
  // Experimental features
  experimental: {
    // Cache Components (nouveau Next.js 16)
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
```

### 11.3 Scripts package.json

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "deploy:staging": "opennextjs-cloudflare build && opennextjs-cloudflare deploy --env staging",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts",
    "db:migrate": "wrangler d1 migrations apply ecommerce-db",
    "db:seed": "wrangler d1 execute ecommerce-db --file=./db/seeds/initial.sql"
  }
}
```

### 11.4 Migration des APIs asynchrones (Next.js 16)

Next.js 16 requiert que `params` et `searchParams` soient des Promises :

```typescript
// ❌ AVANT (Next.js 14/15) - Ne fonctionne plus
export default function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  return <ProductDetails slug={slug} />;
}

// ✅ APRÈS (Next.js 16) - Obligatoire
export default async function ProductPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  return <ProductDetails slug={slug} />;
}

// ✅ Pour les searchParams également
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page } = await searchParams;
  // ...
}
```

#### Types helpers (Next.js 16)

```typescript
// Utiliser les types helpers générés automatiquement
// Exécuter: npx next typegen

import type { PageProps, LayoutProps } from "next";

export default async function Page(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const query = await props.searchParams;
  return <ProductDetails slug={slug} />;
}
```

### 11.5 Configuration `proxy.ts` (remplace middleware.ts)

```typescript
// src/proxy.ts (nouveau nom en Next.js 16)
import { NextRequest, NextResponse } from "next/server";

// Note: proxy.ts utilise le runtime Node.js, pas Edge
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protection des routes admin
  if (pathname.startsWith("/admin")) {
    const session = request.cookies.get("session");
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }
  
  // Headers de sécurité
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  
  return response;
}

export const config = {
  matcher: [
    // Routes à protéger
    "/admin/:path*",
    "/account/:path*",
    "/checkout/:path*",
  ],
};
```

### 11.6 Pipeline CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml

name: Deploy to Cloudflare

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"

jobs:
  # Tests et vérifications
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Run tests
        run: npm run test --if-present

  # Preview pour les PRs
  preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      
      - run: npm ci
      
      - name: Build with OpenNext
        run: npx opennextjs-cloudflare build
      
      - name: Deploy Preview
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: deploy --dry-run
      
      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployment ready!'
            })

  # Déploiement Staging
  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      
      - run: npm ci
      
      - name: Build with OpenNext
        run: npx opennextjs-cloudflare build
        env:
          SITE_URL: ${{ vars.SITE_URL }}
      
      - name: Deploy to Staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: deploy --env staging

  # Déploiement Production
  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      
      - run: npm ci
      
      - name: Build with OpenNext
        run: npx opennextjs-cloudflare build
        env:
          SITE_URL: ${{ vars.SITE_URL }}
          NODE_ENV: production
      
      - name: Run D1 Migrations
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: d1 migrations apply ecommerce-db --remote
      
      - name: Deploy to Production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: deploy
```

### 11.7 Commandes de Référence

```bash
# === DÉVELOPPEMENT ===

# Démarrer le serveur de développement (Turbopack)
npm run dev

# Preview locale avec le runtime Cloudflare Workers
npm run preview

# Générer les types Cloudflare
npm run cf-typegen

# === BASE DE DONNÉES D1 ===

# Créer la base de données
npx wrangler d1 create ecommerce-db

# Exécuter les migrations (local)
npx wrangler d1 migrations apply ecommerce-db --local

# Exécuter les migrations (remote)
npx wrangler d1 migrations apply ecommerce-db --remote

# Seed des données initiales
npx wrangler d1 execute ecommerce-db --local --file=./db/seeds/initial.sql

# === STOCKAGE ===

# Créer un bucket R2
npx wrangler r2 bucket create ecommerce-assets

# Créer un namespace KV
npx wrangler kv:namespace create CACHE_KV
npx wrangler kv:namespace create SESSION_KV

# Créer une queue
npx wrangler queues create notifications

# === DÉPLOIEMENT ===

# Build avec OpenNext
npx opennextjs-cloudflare build

# Déployer en staging
npm run deploy:staging

# Déployer en production
npm run deploy

# === SECRETS ===

# Définir les secrets
npx wrangler secret put JWT_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put WHATSAPP_TOKEN

# === MONITORING ===

# Logs en temps réel
npx wrangler tail

# Logs de déploiement
npx wrangler deployments list
```

---

## 12. Estimation des Coûts

### 12.1 Coûts Cloudflare (Abonnement Pro)

| Service | Inclus/Gratuit | Coût additionnel estimé |
|---------|----------------|------------------------|
| Cloudflare Pro | 20$/mois | Inclus dans abonnement |
| Workers | 10M req/mois inclus | 0.30$/M req supplémentaires |
| D1 | 5M lectures, 100K écritures/jour | Suffisant pour le lancement |
| KV | 100K lectures, 1K écritures/jour | Suffisant pour le lancement |
| R2 | 10 Go stockage, 1M opérations | 0.015$/Go supplémentaire |
| Queues | 1M opérations incluses | 0.40$/M supplémentaires |

### 12.2 Services Externes

| Service | Plan | Coût estimé/mois |
|---------|------|------------------|
| Resend (emails) | Free tier: 3000 emails/mois | 0$ (lancement) |
| WhatsApp Business API | Meta Cloud API | ~0.05$/message |
| Domaine .ci | Annuel | ~50 000 XOF/an |

### 12.3 Projection Mensuelle

| Phase | Trafic | Coût Cloudflare | Services externes | Total |
|-------|--------|-----------------|-------------------|-------|
| Lancement | 3K visiteurs | ~25$ | ~5$ | **~30$/mois** |
| Croissance | 10K visiteurs | ~30$ | ~15$ | **~45$/mois** |
| Mature | 50K visiteurs | ~50$ | ~50$ | **~100$/mois** |

> **💰 Coût total estimé au lancement : ~25-30$/mois (≈15 000-18 000 XOF/mois)**
> 
> Le modèle serverless permet de payer uniquement pour l'usage réel, avec une excellente scalabilité.

---

## 13. Roadmap de Développement

### Phase 1 : MVP (Semaines 1-6)

**Objectif :** Site fonctionnel avec parcours d'achat complet

- [ ] Setup projet Next.js 16 + OpenNext + Cloudflare
- [ ] Base de données D1 et schéma initial
- [ ] Authentification (email + Google OAuth)
- [ ] Catalogue produits (liste, détail, catégories)
- [ ] Recherche simple
- [ ] Panier (ajout, modification, suppression)
- [ ] Checkout avec paiement à la livraison
- [ ] Confirmation commande par email
- [ ] Back-office basique (produits, commandes)
- [ ] Design responsive mobile-first
- [ ] **SEO de base :**
  - [ ] Métadonnées dynamiques (title, description)
  - [ ] Sitemap.xml automatique
  - [ ] Robots.txt
  - [ ] URLs SEO-friendly avec slugs
  - [ ] Balises Open Graph

### Phase 2 : Fonctionnalités Complètes (Semaines 7-10)

**Objectif :** Expérience utilisateur enrichie

- [ ] Recherche avancée avec filtres
- [ ] Système de codes promo complet
- [ ] Avis et notes produits
- [ ] Notifications WhatsApp
- [ ] OAuth Facebook et Apple
- [ ] Gestion des stocks avec alertes
- [ ] Dashboard analytics admin
- [ ] Liste de souhaits (wishlist)
- [ ] Historique commandes détaillé
- [ ] Suivi de livraison
- [ ] **SEO avancé :**
  - [ ] Données structurées Product (Schema.org)
  - [ ] Rich snippets (prix, avis, disponibilité)
  - [ ] Breadcrumbs structurés
  - [ ] Gestion canonical pour filtres/pagination
  - [ ] Schema LocalBusiness

### Phase 3 : Optimisation (Semaines 11-12)

**Objectif :** Performance et qualité

- [ ] Optimisation performances (cache, images WebP/AVIF)
- [ ] Tests de charge et ajustements
- [ ] PWA (Progressive Web App)
- [ ] Documentation utilisateur
- [ ] Formation équipe
- [ ] Tests utilisateurs
- [ ] Corrections bugs
- [ ] **SEO Performance :**
  - [ ] Core Web Vitals > 90 mobile
  - [ ] Configuration Google Search Console
  - [ ] Configuration Google Analytics 4
  - [ ] Soumission sitemap
  - [ ] Création Google Business Profile
- [ ] **Mise en production**

### Phase 4 : Évolutions Futures (Post-lancement)

**Objectif :** Croissance et nouvelles fonctionnalités

- [ ] Application mobile (React Native / Expo)
- [ ] Intégration paiement mobile (Orange Money, MTN Money, Wave)
- [ ] Programme de fidélité
- [ ] Recherche sémantique avec Workers AI
- [ ] Chat support en temps réel (Durable Objects)
- [ ] Comparateur de produits
- [ ] Notifications push
- [ ] API partenaires / affiliés
- [ ] **Expansion UEMOA :**
  - [ ] Multi-langue (anglais)
  - [ ] Configuration hreflang
  - [ ] Adaptation SEO local par pays
  - [ ] Zones de livraison étendues

---

## Annexes

### A. Commandes Utiles

```bash
# === CRÉATION DU PROJET ===

# Créer un nouveau projet Next.js 16 + Cloudflare (recommandé)
npm create cloudflare@latest -- ecommerce-ci --framework=next --platform=workers

# Ou manuellement avec un projet existant
npm install @opennextjs/cloudflare wrangler

# === DÉVELOPPEMENT ===

# Démarrer avec Turbopack (défaut Next.js 16)
npm run dev

# Preview avec le runtime Cloudflare
npm run preview

# Générer les types Cloudflare
npm run cf-typegen

# === BASE DE DONNÉES D1 ===

# Créer la base de données
npx wrangler d1 create ecommerce-db

# Créer une migration
npx wrangler d1 migrations create ecommerce-db add_reviews_table

# Appliquer les migrations (local)
npx wrangler d1 migrations apply ecommerce-db --local

# Appliquer les migrations (production)
npx wrangler d1 migrations apply ecommerce-db --remote

# Exécuter un fichier SQL
npx wrangler d1 execute ecommerce-db --local --file=./db/seeds/initial.sql

# Console D1 interactive
npx wrangler d1 execute ecommerce-db --local --command="SELECT * FROM products LIMIT 5"

# === STOCKAGE R2 ===

# Créer un bucket
npx wrangler r2 bucket create ecommerce-assets

# Lister les objets
npx wrangler r2 object list ecommerce-assets

# === KV NAMESPACE ===

# Créer un namespace
npx wrangler kv:namespace create CACHE_KV
npx wrangler kv:namespace create SESSION_KV

# Lister les clés
npx wrangler kv:key list --namespace-id=<NAMESPACE_ID>

# === QUEUES ===

# Créer une queue
npx wrangler queues create notifications

# === DÉPLOIEMENT ===

# Build avec OpenNext
npx opennextjs-cloudflare build

# Déployer
npx opennextjs-cloudflare deploy

# Upload sans déployer (utile pour CI)
npx opennextjs-cloudflare upload

# === SECRETS ===

# Ajouter un secret
npx wrangler secret put JWT_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID

# Lister les secrets
npx wrangler secret list

# === MONITORING ===

# Logs en temps réel
npx wrangler tail

# Liste des déploiements
npx wrangler deployments list

# Rollback
npx wrangler rollback
```

### B. Migration depuis Next.js 14/15

Si vous avez un projet existant en Next.js 14 ou 15 :

```bash
# 1. Mettre à jour Next.js
npm install next@16 react@latest react-dom@latest

# 2. Exécuter le codemod de migration
npx @next/codemod@latest upgrade

# 3. Migrer les params/searchParams asynchrones
npx @next/codemod@latest async-request-apis

# 4. Renommer middleware.ts en proxy.ts
mv src/middleware.ts src/proxy.ts
# Et renommer la fonction exportée de middleware() à proxy()

# 5. Installer l'adaptateur OpenNext
npm install @opennextjs/cloudflare

# 6. Créer open-next.config.ts
# (voir section 10.2)

# 7. Mettre à jour wrangler.toml
# (voir section 10.2)
```

### C. Ressources et Documentation

#### Documentation Officielle

| Ressource | URL |
|-----------|-----|
| Next.js 16 | https://nextjs.org/docs |
| Guide de migration Next.js 16 | https://nextjs.org/docs/app/guides/upgrading/version-16 |
| OpenNext Cloudflare | https://opennext.js.org/cloudflare |
| Cloudflare Workers | https://developers.cloudflare.com/workers/ |
| Cloudflare D1 | https://developers.cloudflare.com/d1/ |
| Cloudflare R2 | https://developers.cloudflare.com/r2/ |
| Cloudflare KV | https://developers.cloudflare.com/kv/ |
| Cloudflare Queues | https://developers.cloudflare.com/queues/ |

#### Outils et Librairies

| Outil | URL |
|-------|-----|
| shadcn/ui | https://ui.shadcn.com/ |
| Tailwind CSS | https://tailwindcss.com/ |
| Zustand | https://zustand-demo.pmnd.rs/ |
| React Hook Form | https://react-hook-form.com/ |
| Zod | https://zod.dev/ |
| Resend | https://resend.com/docs |
| WhatsApp Business API | https://developers.facebook.com/docs/whatsapp/cloud-api |

#### Exemples et Templates

| Ressource | URL |
|-----------|-----|
| OpenNext Examples | https://github.com/opennextjs/opennextjs-cloudflare/tree/main/examples |
| Next.js Commerce | https://github.com/vercel/commerce |
| Cloudflare Workers Examples | https://github.com/cloudflare/workers-sdk/tree/main/templates |

### D. Checklist de Lancement

#### Avant le développement
- [ ] Compte Cloudflare Pro configuré
- [ ] Domaine .ci enregistré et configuré
- [ ] Comptes OAuth créés (Google, Facebook, Apple)
- [ ] Compte Resend créé
- [ ] Compte WhatsApp Business vérifié

#### Avant le staging
- [ ] Tests unitaires passent
- [ ] Tests e2e passent
- [ ] Migrations D1 fonctionnent
- [ ] Secrets configurés en staging
- [ ] CI/CD configuré

#### Avant la production
- [ ] Performance testée (Lighthouse > 90)
- [ ] SEO vérifié (métadonnées, sitemap)
- [ ] Sécurité auditée (headers, WAF)
- [ ] Backup D1 configuré
- [ ] Monitoring et alertes configurés
- [ ] Documentation utilisateur prête
- [ ] Formation équipe effectuée

---

*Document mis à jour le 30 janvier 2026 - Next.js 16.1 + OpenNext*
