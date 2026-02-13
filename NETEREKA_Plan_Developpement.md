# Plan de Développement - NETEREKA Electronic

## 📋 Informations Projet

| Élément | Détail |
|---------|--------|
| **Projet** | NETEREKA Electronic - Boutique e-commerce |
| **Développeur** | Solo |
| **Date début** | 30 janvier 2026 |
| **Date lancement cible** | 28 février 2026 |
| **Durée totale** | 4 semaines (30 jours) |
| **Stack** | Next.js 16 + OpenNext + Cloudflare Workers |

---

## 🎯 Objectif MVP

Lancer une boutique e-commerce fonctionnelle avec :
- ✅ Catalogue produits complet avec variantes
- ✅ Recherche et filtres
- ✅ Panier et checkout (paiement à la livraison)
- ✅ Authentification (email + OAuth Google/Facebook/Apple)
- ✅ Espace client (compte, commandes, adresses)
- ✅ Notifications (email + WhatsApp)
- ✅ Back-office admin complet
- ❌ Multi-langue (anglais) → V2

---

## 📊 Vue d'Ensemble - Timeline

```
Semaine 1 (30 jan - 5 fév)   : Setup + Base + Auth + Catalogue
Semaine 2 (6 fév - 12 fév)   : Panier + Checkout + Commandes
Semaine 3 (13 fév - 19 fév)  : Back-office + Notifications + Compte client
Semaine 4 (20 fév - 28 fév)  : Tests + Contenu + Polish + Lancement
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ JANVIER                              FÉVRIER 2026                           │
│ 30 31 │ 1  2  3  4  5 │ 6  7  8  9 10 11 12 │ 13 14 15 16 17 18 19 │ 20-28 │
│───────┼───────────────┼────────────────────┼──────────────────────┼───────│
│  S1   │   SEMAINE 1   │     SEMAINE 2      │      SEMAINE 3       │  S4   │
│ Setup │ Auth+Catalogue│  Panier+Checkout   │  Admin+Notifications │ Tests │
│       │               │                    │                      │Launch │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📅 Semaine 1 : Fondations (30 jan - 5 fév)

### Objectif
Infrastructure technique + Authentification + Catalogue de base

### Jour 1-2 : Setup Projet (30-31 jan)

#### Tâches
- [x] Créer projet Next.js 16 avec OpenNext
- [x] Configurer Cloudflare (D1, KV, R2, Workers)
- [x] Setup Git + GitHub repository
- [ ] Configurer environnements (dev, staging, prod)
- [x] Installer dépendances (Tailwind, shadcn/ui, Zustand, etc.)
- [x] Créer structure dossiers selon architecture
- [x] Configurer ESLint, Prettier, TypeScript strict
- [x] Premier déploiement test sur Cloudflare (13 fév — Workers Paid, domaine netereka.ci)

#### Livrables
- [x] Projet qui build et déploie sur Cloudflare
- [x] Page "Coming Soon" en production
- [ ] README avec instructions setup

#### Validation
```bash
npm run dev        # Fonctionne en local
npm run deploy     # Déploie sur Cloudflare
```

---

### Jour 3 : Base de Données (1 fév)

#### Tâches
- [x] Créer schéma SQL complet (D1)
- [x] Créer migrations initiales
- [x] Seed data de test (catégories, quelques produits)
- [x] Helper fonctions DB (queries réutilisables)
- [x] Tester connexion D1 en local (via Kysely + D1Dialect)

#### Livrables
- [x] Fichier `schema.sql` complet
- [x] Migrations fonctionnelles
- [x] Script de seed

#### Validation
```bash
npm run db:migrate  # Migrations OK
npm run db:seed     # Données de test insérées
```

---

### Jour 4-5 : Authentification (2-3 fév)

#### Tâches
- [x] Système auth email/password (inscription, connexion)
- [x] Hash bcrypt pour mots de passe (Better Auth)
- [x] Sessions cookies HttpOnly (Better Auth sessions, 7 jours)
- [ ] OAuth Google (config prête, clés manquantes)
- [ ] OAuth Facebook (config prête, clés manquantes)
- [ ] OAuth Apple (config prête, clés manquantes)
- [x] Middleware protection routes
- [x] Pages : `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/reset-password`
- [ ] Composants : formulaires, validation Zod (state local pour l'instant)
- [x] CAPTCHA Cloudflare Turnstile (sign-up, sign-in, forgot-password)
- [x] Adaptateur D1 via Kysely + kysely-d1

#### Livrables
- [x] Auth email/password fonctionnelle
- [x] Sessions persistantes
- [ ] OAuth 3 providers (clés à configurer)

#### Validation
- [x] Peut créer un compte email
- [ ] Peut se connecter avec Google/Facebook/Apple (clés manquantes)
- [x] Session persiste après refresh
- [x] Routes protégées inaccessibles sans auth

---

### Jour 6-7 : Catalogue Produits (4-5 fév)

#### Tâches
- [x] Import catalogue Excel → D1 (147 produits, 9 catégories, 617 variantes)
- [x] Script de transformation données (`scripts/import-catalogue.ts`)
- [x] API : liste produits, détail, par catégorie (`lib/db/products.ts`, `lib/db/categories.ts`)
- [x] Page Homepage avec sections scroll horizontal (hero, meilleures ventes, nouveautés, par catégorie)
- [x] Page catégorie avec grille produits (`/c/[slug]` + pagination)
- [x] Page détail produit (`/p/[slug]` + galerie images + sélecteur variantes)
- [x] Composants : ProductCard, ProductGrid, Header (search/cart icons), CategoryNav, HeroBanner, TrustBadges
- [x] Navigation par catégories (pills horizontales avec icônes)
- [x] Images produits uploadées vers R2 avec noms SEO-friendly

#### Livrables
- [x] Homepage fonctionnelle
- [x] Navigation catégories
- [x] Fiches produits

#### Validation
- [x] Homepage affiche produits dynamiquement
- [x] Clic sur produit → page détail
- [x] Navigation catégories fonctionne

---

### ✅ Checkpoint Semaine 1

| Critère | Status |
|---------|--------|
| Projet déployé sur Cloudflare | ✅ |
| Auth email fonctionnelle | ✅ |
| Auth OAuth 3 providers | ⬜ (clés à configurer) |
| Catalogue produits affiché | ✅ |
| Navigation complète | ✅ |

---

## 📅 Semaine 2 : E-commerce Core (6 - 12 fév)

### Objectif
Panier + Checkout + Gestion commandes

### Jour 8-9 : Panier (6-7 fév)

#### Tâches
- [x] Store Zustand pour panier (état local, persistance localStorage versionnée)
- [x] Sync panier avec KV (persistance serveur) — PR #47
- [x] Merge panier anonyme → authentifié — PR #47
- [x] Actions : ajouter, modifier quantité (max 10), supprimer
- [x] Drawer panier (slide from right, Escape, body scroll lock)
- [x] Page `/cart` complète (récapitulatif, vider avec confirmation)
- [x] Calcul sous-total (frais livraison → calculés au checkout)
- [x] Sélection variantes sur page produit (variantes = lignes séparées)

#### Livrables
- [x] Panier fonctionnel
- [x] Persistance cross-session (localStorage)
- [x] UI drawer + page

#### Validation
- [x] Ajouter produit → badge panier update
- [x] Fermer navigateur → panier conservé
- [x] Variantes sélectionnables

---

### Jour 10 : Codes Promo (8 fév)

#### Tâches
- [x] Table promo_codes en DB (migration initiale)
- [x] Server action validation code promo (auth-gated, vérifie dates/limites/min achat)
- [x] Types : pourcentage, montant fixe
- [x] Conditions : min achat, dates validité, limite d'utilisation
- [x] UI application code dans checkout (input + bouton Appliquer)
- [x] Affichage réduction (discount capé au sous-total, total protégé contre négatif)

#### Livrables
- [x] Système promo complet
- [x] Validation temps réel

#### Validation
- [x] Code valide → réduction appliquée
- [x] Code invalide → message erreur
- [x] Conditions respectées

---

### Jour 11-12 : Checkout (9-10 fév)

#### Tâches
- [x] Page checkout single page (auth-gated, server component + client form)
- [x] Formulaire adresse livraison (adresses enregistrées + nouvelle adresse)
- [x] Sélection zone livraison / commune (calcul frais automatique)
- [x] Récapitulatif commande (images, variantes, quantités, prix)
- [x] Confirmation paiement à la livraison (COD card informatif)
- [x] Création commande en DB (D1 batch atomique : stock decrement + order + items + promo)
- [x] Génération numéro commande unique (ORD-XXXXXX, UNIQUE constraint)
- [x] Page confirmation avec récap (vide panier côté client)
- [x] Validation Zod server-side (prix re-fetchés depuis DB, stock vérifié)
- [x] Rollback automatique si stock concurrent insuffisant
- [x] Sauvegarde optionnelle de la nouvelle adresse

#### Livrables
- [x] Checkout complet
- [x] Commande créée en DB

#### Validation
- [x] Parcours complet : panier → checkout → confirmation
- [x] Commande visible en DB
- [x] Numéro commande généré

---

### Jour 13-14 : Recherche & Filtres (11-12 fév)

#### Tâches
- [x] Recherche full-text (LIKE ou FTS5)
- [x] Page résultats recherche
- [x] Filtres : catégorie, marque, prix min/max
- [x] Tri : pertinence, prix, nouveauté
- [x] UI filtres (bottom sheet mobile)
- [x] Pagination "Charger plus"
- [x] Autocomplete suggestions

#### Livrables
- [x] Recherche fonctionnelle
- [x] Filtres combinables
- [x] UX mobile optimisée

#### Validation
- [x] Recherche "iPhone" → résultats pertinents
- [x] Filtres se combinent correctement
- [x] Pagination fonctionne

---

### ✅ Checkpoint Semaine 2

| Critère | Status |
|---------|--------|
| Panier persistant fonctionnel | ✅ |
| Checkout complet | ✅ |
| Commandes créées en DB | ✅ |
| Recherche + filtres | ✅ |
| Codes promo | ✅ |

---

## 📅 Semaine 3 : Admin & Notifications (13 - 19 fév)

### Objectif
Back-office complet + Notifications + Espace client

### Jour 15-16 : Back-office Produits (13-14 fév)

#### Tâches
- [x] Layout admin (sidebar, header)
- [x] Dashboard KPIs (stats basiques)
- [x] Liste produits avec recherche/filtres
- [x] CRUD produit complet
- [x] Gestion variantes (ajout, modif, suppression)
- [x] Upload images vers R2
- [x] Gestion catégories
- [ ] Import CSV produits (mise à jour en masse)

#### Livrables
- [x] Admin produits complet
- [x] Upload images fonctionnel

#### Validation
- [x] Créer un produit avec variantes
- [x] Uploader des images
- [x] Modifier/supprimer produit

---

### Jour 17-18 : Back-office Commandes (15-16 fév)

#### Tâches
- [x] Liste commandes avec filtres (statut, date, commune, recherche)
- [x] Détail commande complet
- [x] Workflow statuts (En attente → Confirmée → Préparation → Livraison → Livrée)
- [x] Assignation livreur
- [x] Notes internes
- [x] Gestion retours/annulations
- [x] Export commandes CSV
- [x] Génération facture (page imprimable HTML)

#### Livrables
- [x] Gestion commandes complète
- [x] Workflow statuts

#### Validation
- [x] Changer statut commande
- [x] Générer facture (impression)
- [x] Filtrer par statut

---

### Back-office Utilisateurs (6 fév — réalisé en avance)

#### Tâches
- [x] Séparer `/customers` (clients, role=customer) et `/users` (staff, role=admin|super_admin)
- [x] Filtrer les requêtes DB par rôle (customers.ts + nouveau users.ts)
- [x] Sidebar admin : deux entrées distinctes "Clients" et "Utilisateurs"
- [x] Supprimer filtre/colonne/badge rôle des vues clients
- [x] Créer vues utilisateurs (table desktop, cards mobile, filtres, detail)
- [x] Page détail utilisateur (info + gestion rôle admin ↔ super_admin)
- [x] Guards sur les pages détail (404 si rôle incorrect)
- [x] Revalidation croisée lors des changements de rôle

#### Livrables
- [x] Section clients dédiée aux acheteurs
- [x] Section utilisateurs dédiée au staff admin

#### Validation
- [x] `/customers` n'affiche que les clients
- [x] `/users` n'affiche que les admins/super_admins
- [x] Promotion client → admin : disparaît de clients, apparaît dans utilisateurs
- [x] Vues responsive (desktop table + mobile cards) fonctionnelles

---

### Jour 19 : Notifications (17 fév — emails réalisés en avance)

#### Tâches
- [x] Setup Resend (email) — `resend` v6.9.1, `lib/notifications/email.ts`
- [x] Templates emails (confirmation commande, 6 statuts : confirmé/préparation/expédition/livré/annulé/retourné)
- [ ] Setup WhatsApp Business API
- [ ] Templates WhatsApp pré-approuvés
- [ ] Queue Cloudflare pour envoi asynchrone (actuellement fire-and-forget direct)
- [x] Triggers automatiques sur changement statut (`actions/checkout.ts`, `actions/admin/orders.ts`)

#### Livrables
- [x] Emails transactionnels fonctionnels
- [ ] WhatsApp notifications

#### Validation
- [x] Commande → email confirmation reçu
- [ ] Changement statut → WhatsApp reçu

---

### Jour 20-21 : Espace Client (18-19 fév)

#### Tâches
- [x] Page profil (modifier infos)
- [x] Gestion adresses (CRUD)
- [x] Historique commandes
- [x] Détail commande + suivi statut
- [x] Wishlist (liste de souhaits)
- [x] Système avis produits
- [x] Page réinitialisation mot de passe

#### Livrables
- [x] Espace client complet
- [x] Avis produits

#### Validation
- [x] Modifier son profil
- [x] Voir historique commandes
- [x] Laisser un avis

---

### ✅ Checkpoint Semaine 3

| Critère | Status |
|---------|--------|
| Back-office produits | ✅ |
| Back-office commandes | ✅ |
| Back-office utilisateurs (clients/staff séparés) | ✅ |
| Emails transactionnels (Resend) | ✅ |
| WhatsApp notifications | ⬜ |
| Espace client complet | ✅ |
| Avis produits | ✅ |

---

## 📅 Semaine 4 : Finalisation & Lancement (20 - 28 fév)

### Objectif
Tests, contenu, optimisation, mise en production

### Jour 22-23 : Contenu & SEO (20-21 fév — largement réalisé en avance)

#### Tâches
- [x] Rédiger CGV → `/conditions-generales` (12 sections complètes)
- [x] Rédiger politique de livraison → `/livraison` (zones, tarifs, délais)
- [x] Rédiger page À propos → `/a-propos` (mission, engagements, schema LocalBusiness)
- [x] Rédiger FAQ → `/faq` (12 Q&A + schema FAQPage)
- [x] Page Contact → `/contact` (adresse, email, horaires)
- [x] Métadonnées SEO toutes pages (OG, Twitter, canonical, keywords, locale fr_CI)
- [x] Sitemap.xml → `app/sitemap.ts` (dynamique : pages statiques + produits + catégories depuis DB)
- [x] Robots.txt → `app/robots.ts` (exclut admin, auth, filtres anti-duplicate)
- [x] Données structurées (Schema.org) — Organization, WebSite, Product, FAQPage, LocalBusiness, Breadcrumbs
- [x] Configuration Google Search Console (meta tag vérification ajoutée)
- [x] Configuration Google Analytics 4 (gtag conditionnel au consentement cookies — PR #48)

#### Livrables
- [x] Contenu légal complet
- [x] SEO technique configuré
- [x] Analytics (GA4 + Search Console)

#### Validation
- [x] Toutes pages accessibles
- [x] Sitemap valide
- [x] GA4 conditionnel au consentement cookies

---

### Jour 24 : Images Produits (22 fév)

#### Tâches
- [ ] Préparer images produits (shoot ou récupération)
- [ ] Optimiser images (compression, format WebP)
- [ ] Upload vers R2
- [ ] Associer images aux produits
- [ ] Vérifier affichage toutes pages

#### Livrables
- [ ] Catalogue avec vraies images

#### Validation
- [ ] Toutes images chargent correctement
- [ ] Performance OK (< 200KB/image)

---

### Jour 25-26 : Tests & Debug (23-24 fév)

#### Tâches
- [ ] Test parcours complet utilisateur
- [ ] Test sur différents appareils (iOS, Android)
- [ ] Test différents navigateurs
- [ ] Test connexion lente (3G)
- [ ] Correction bugs identifiés
- [ ] Test checkout avec vraies données
- [ ] Test notifications (email + WhatsApp)
- [ ] Test back-office complet
- [ ] Vérifier performances (Lighthouse > 90)

#### Livrables
- [ ] Liste bugs corrigés
- [ ] Rapport Lighthouse

#### Validation
- [ ] Parcours sans erreur
- [ ] Lighthouse mobile > 90
- [ ] Notifications reçues

---

### Jour 27 : Nom de Domaine & DNS (13 fév — réalisé en avance)

#### Tâches
- [x] Acheter domaine netereka.ci
- [x] Configurer DNS sur Cloudflare (A records proxied + Workers routes)
- [x] Certificat SSL actif (Cloudflare Universal SSL)
- [x] Routes www.netereka.ci + netereka.ci configurées
- [x] Tester accès production

#### Livrables
- [x] Site accessible sur domaine final

#### Validation
- [x] https://netereka.ci fonctionne
- [x] SSL valide (cadenas vert)

---

### Jour 28 : Pré-lancement (26 fév)

#### Tâches
- [ ] Données de production finales
- [ ] Supprimer données de test
- [ ] Vérifier tous les liens
- [ ] Tester formulaire contact
- [ ] Créer compte admin production
- [ ] Backup base de données
- [ ] Préparer communication lancement

#### Livrables
- [ ] Site prêt pour lancement

#### Validation
- [ ] Checklist pré-lancement 100%

---

### Jour 29-30 : Lancement 🚀 (27-28 fév)

#### Tâches
- [ ] Lancement officiel
- [ ] Annonce réseaux sociaux
- [ ] Monitoring temps réel
- [ ] Support réactif (WhatsApp)
- [ ] Correction bugs urgents si nécessaire
- [ ] Première commande ! 🎉

#### Livrables
- [ ] Site en ligne et opérationnel

---

### ✅ Checkpoint Semaine 4 - LANCEMENT

| Critère | Status |
|---------|--------|
| Contenu légal complet | ✅ |
| SEO configuré (GA4 + Search Console) | ✅ |
| Images produits | ⬜ |
| Tests validés | ⬜ |
| Domaine configuré | ✅ |
| Lighthouse > 90 | ⬜ |
| **SITE EN LIGNE** | ✅ |

---

## 📋 Checklist Pré-lancement

### Technique
- [x] HTTPS actif (Cloudflare Universal SSL)
- [ ] Toutes pages chargent < 3s
- [ ] Mobile responsive parfait
- [ ] Formulaires validés
- [x] Erreurs 404 gérées (page not-found custom)
- [ ] Erreurs 500 gérées avec page erreur

### Fonctionnel
- [ ] Inscription/connexion OK
- [ ] Parcours achat complet OK
- [ ] Paiement à la livraison OK
- [x] Emails envoyés OK (Resend)
- [ ] WhatsApp envoyé OK
- [ ] Back-office fonctionnel

### Contenu
- [ ] Tous produits avec images
- [ ] Descriptions complètes
- [ ] Prix corrects
- [ ] Stock à jour
- [x] CGV publiées
- [x] Politique livraison publiée

### SEO & Analytics
- [x] Titles et descriptions uniques
- [x] Sitemap soumis
- [x] Google Analytics actif (conditionnel au consentement)
- [x] Search Console configuré (meta tag vérification)

### Légal
- [x] Mentions légales (CGV + À propos)
- [x] Politique confidentialité (mise à jour avec Google Analytics)
- [x] Gestion cookies (bandeau consentement + personnalisation — PR #48)

---

## 🔧 Tâches Parallèles (tout au long du projet)

### Contenu (à préparer en parallèle)
| Tâche | Deadline | Status |
|-------|----------|--------|
| Rédiger CGV | 19 fév | ✅ |
| Rédiger politique livraison | 19 fév | ✅ |
| Rédiger page À propos | 19 fév | ✅ |
| Rédiger FAQ | 19 fév | ✅ |
| Préparer images produits | 21 fév | ⬜ |

### Infrastructure (à faire dès que possible)
| Tâche | Deadline | Status |
|-------|----------|--------|
| Réserver nom de domaine | 15 fév | ✅ (netereka.ci) |
| Créer compte Resend | 10 fév | ✅ |
| Configurer WhatsApp templates | 15 fév | ⬜ |

---

## 📊 Métriques de Suivi

### Vélocité
| Semaine | Tâches prévues | Tâches complétées | % |
|---------|----------------|-------------------|---|
| S1 | 25 | 25 | 100% |
| S2 | 32 | 30 | 94% |
| S3 | 24 | 22 | 92% |
| S4 | 18 | - | - |

### Blockers Log
| Date | Blocker | Impact | Résolution |
|------|---------|--------|------------|
| 13 fév | opennextjs-cloudflare: "Node.js middleware not supported" | Build bloqué | Convertir proxy.ts → middleware.ts (Edge runtime) |
| 13 fév | Worker exceeds 3 MiB free plan limit (3.9 MiB gzipped) | Deploy bloqué | Upgrade Workers Paid plan ($5/mois) |

---

## 🆘 Plan de Contingence

### Si retard Semaine 1-2
- Simplifier OAuth (garder seulement Google)
- Reporter avis produits à post-lancement
- UI admin plus basique

### Si retard Semaine 3
- ~~Reporter wishlist à post-lancement~~ ✅ Fait
- Templates emails basiques
- Dashboard admin simplifié

### Si retard Semaine 4
- Lancement avec images placeholder professionnelles
- FAQ minimale
- Soft launch (cercle restreint) puis lancement officiel J+3

### Fonctionnalités sacrifiables (si vraiment nécessaire)
1. ~~Wishlist → Post-lancement~~ ✅ Fait
2. ~~Avis produits → Post-lancement~~ ✅ Fait
3. OAuth Facebook/Apple → Post-lancement (garder Google)
4. Génération PDF facture → Post-lancement
5. Export CSV commandes → Post-lancement

---

## 📞 Ressources & Support

### Documentation
- [Next.js 16 Docs](https://nextjs.org/docs)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Resend Docs](https://resend.com/docs)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

### En cas de blocage
1. Documentation officielle
2. GitHub Issues des projets
3. Discord Cloudflare
4. Stack Overflow
5. Claude (moi 😊)

---

## 🎯 Définition du Succès

### Lancement réussi si :
- [ ] Site accessible 24/7
- [ ] Au moins 1 commande passée
- [ ] Notifications email/WhatsApp fonctionnelles
- [ ] Temps de chargement < 3s
- [ ] Aucun bug bloquant

### KPIs première semaine post-lancement :
- Visiteurs uniques : > 100
- Taux de rebond : < 60%
- Commandes : > 5
- Temps moyen session : > 2min

---

*Plan créé le 30 janvier 2026 - NETEREKA Electronic*
