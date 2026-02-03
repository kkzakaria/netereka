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
- [ ] Premier déploiement test sur Cloudflare

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
| Projet déployé sur Cloudflare | ⬜ |
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
- [ ] Sync panier avec KV (persistance serveur) → reporté à l'intégration auth
- [ ] Merge panier anonyme → authentifié → reporté à l'intégration auth
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
- [ ] Liste commandes avec filtres (statut, date)
- [ ] Détail commande complet
- [ ] Workflow statuts (En attente → Confirmée → Préparation → Livraison → Livrée)
- [ ] Assignation livreur
- [ ] Notes internes
- [ ] Gestion retours/annulations
- [ ] Export commandes CSV
- [ ] Génération facture PDF

#### Livrables
- [ ] Gestion commandes complète
- [ ] Workflow statuts

#### Validation
- [ ] Changer statut commande
- [ ] Générer facture PDF
- [ ] Filtrer par statut

---

### Jour 19 : Notifications (17 fév)

#### Tâches
- [ ] Setup Resend ou Brevo (email)
- [ ] Templates emails (confirmation, expédition, livraison)
- [ ] Setup WhatsApp Business API
- [ ] Templates WhatsApp pré-approuvés
- [ ] Queue Cloudflare pour envoi asynchrone
- [ ] Triggers automatiques sur changement statut

#### Livrables
- [ ] Emails transactionnels fonctionnels
- [ ] WhatsApp notifications

#### Validation
- [ ] Commande → email confirmation reçu
- [ ] Changement statut → WhatsApp reçu

---

### Jour 20-21 : Espace Client (18-19 fév)

#### Tâches
- [x] Page profil (modifier infos)
- [x] Gestion adresses (CRUD)
- [x] Historique commandes
- [x] Détail commande + suivi statut
- [ ] Wishlist (liste de souhaits)
- [ ] Système avis produits
- [x] Page réinitialisation mot de passe

#### Livrables
- [x] Espace client complet
- [ ] Avis produits

#### Validation
- [x] Modifier son profil
- [x] Voir historique commandes
- [ ] Laisser un avis

---

### ✅ Checkpoint Semaine 3

| Critère | Status |
|---------|--------|
| Back-office produits | ✅ |
| Back-office commandes | ⬜ |
| Emails transactionnels | ⬜ |
| WhatsApp notifications | ⬜ |
| Espace client complet | ✅ |
| Avis produits | ⬜ |

---

## 📅 Semaine 4 : Finalisation & Lancement (20 - 28 fév)

### Objectif
Tests, contenu, optimisation, mise en production

### Jour 22-23 : Contenu & SEO (20-21 fév)

#### Tâches
- [ ] Rédiger CGV
- [ ] Rédiger politique de livraison
- [ ] Rédiger page À propos
- [ ] Rédiger FAQ
- [ ] Page Contact (formulaire + infos)
- [ ] Métadonnées SEO toutes pages
- [ ] Sitemap.xml
- [ ] Robots.txt
- [ ] Données structurées (Schema.org)
- [ ] Configuration Google Search Console
- [ ] Configuration Google Analytics 4

#### Livrables
- [ ] Contenu légal complet
- [ ] SEO configuré

#### Validation
- [ ] Toutes pages accessibles
- [ ] Sitemap valide
- [ ] GA4 reçoit des données

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

### Jour 27 : Nom de Domaine & DNS (25 fév)

#### Tâches
- [ ] Acheter domaine (netereka.ci ou alternative)
- [ ] Configurer DNS sur Cloudflare
- [ ] Certificat SSL actif
- [ ] Redirection www → apex (ou inverse)
- [ ] Tester accès production

#### Livrables
- [ ] Site accessible sur domaine final

#### Validation
- [ ] https://netereka.ci fonctionne
- [ ] SSL valide (cadenas vert)

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
| Contenu légal complet | ⬜ |
| SEO configuré | ⬜ |
| Images produits | ⬜ |
| Tests validés | ⬜ |
| Domaine configuré | ⬜ |
| Lighthouse > 90 | ⬜ |
| **SITE EN LIGNE** | ⬜ |

---

## 📋 Checklist Pré-lancement

### Technique
- [ ] HTTPS actif
- [ ] Toutes pages chargent < 3s
- [ ] Mobile responsive parfait
- [ ] Formulaires validés
- [ ] Erreurs 404 gérées
- [ ] Erreurs 500 gérées avec page erreur

### Fonctionnel
- [ ] Inscription/connexion OK
- [ ] Parcours achat complet OK
- [ ] Paiement à la livraison OK
- [ ] Emails envoyés OK
- [ ] WhatsApp envoyé OK
- [ ] Back-office fonctionnel

### Contenu
- [ ] Tous produits avec images
- [ ] Descriptions complètes
- [ ] Prix corrects
- [ ] Stock à jour
- [ ] CGV publiées
- [ ] Politique livraison publiée

### SEO & Analytics
- [ ] Titles et descriptions uniques
- [ ] Sitemap soumis
- [ ] Google Analytics actif
- [ ] Search Console configuré

### Légal
- [ ] Mentions légales
- [ ] Politique confidentialité
- [ ] Gestion cookies (si applicable)

---

## 🔧 Tâches Parallèles (tout au long du projet)

### Contenu (à préparer en parallèle)
| Tâche | Deadline | Status |
|-------|----------|--------|
| Rédiger CGV | 19 fév | ⬜ |
| Rédiger politique livraison | 19 fév | ⬜ |
| Rédiger page À propos | 19 fév | ⬜ |
| Rédiger FAQ | 19 fév | ⬜ |
| Préparer images produits | 21 fév | ⬜ |

### Infrastructure (à faire dès que possible)
| Tâche | Deadline | Status |
|-------|----------|--------|
| Réserver nom de domaine | 15 fév | ⬜ |
| Créer compte Resend/Brevo | 10 fév | ⬜ |
| Configurer WhatsApp templates | 15 fév | ⬜ |

---

## 📊 Métriques de Suivi

### Vélocité
| Semaine | Tâches prévues | Tâches complétées | % |
|---------|----------------|-------------------|---|
| S1 | 25 | 25 | 100% |
| S2 | 32 | 30 | 94% |
| S3 | 24 | 17 | 71% |
| S4 | 18 | - | - |

### Blockers Log
| Date | Blocker | Impact | Résolution |
|------|---------|--------|------------|
| - | - | - | - |

---

## 🆘 Plan de Contingence

### Si retard Semaine 1-2
- Simplifier OAuth (garder seulement Google)
- Reporter avis produits à post-lancement
- UI admin plus basique

### Si retard Semaine 3
- Reporter wishlist à post-lancement
- Templates emails basiques
- Dashboard admin simplifié

### Si retard Semaine 4
- Lancement avec images placeholder professionnelles
- FAQ minimale
- Soft launch (cercle restreint) puis lancement officiel J+3

### Fonctionnalités sacrifiables (si vraiment nécessaire)
1. Wishlist → Post-lancement
2. Avis produits → Post-lancement
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
