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
- [ ] Tester connexion D1 en local et remote

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
- [ ] Système auth email/password (inscription, connexion)
- [ ] Hash bcrypt pour mots de passe
- [ ] Sessions JWT (cookies HttpOnly)
- [ ] OAuth Google
- [ ] OAuth Facebook
- [ ] OAuth Apple
- [ ] Middleware protection routes
- [ ] Pages : `/auth/login`, `/auth/register`, `/auth/forgot-password`
- [ ] Composants : formulaires, validation Zod

#### Livrables
- [ ] Auth complète fonctionnelle
- [ ] Sessions persistantes
- [ ] OAuth 3 providers

#### Validation
- [ ] Peut créer un compte email
- [ ] Peut se connecter avec Google/Facebook/Apple
- [ ] Session persiste après refresh
- [ ] Routes protégées inaccessibles sans auth

---

### Jour 6-7 : Catalogue Produits (4-5 fév)

#### Tâches
- [ ] Import catalogue Excel → D1
- [ ] Script de transformation données
- [ ] API : liste produits, détail, par catégorie
- [ ] Page Homepage avec sections scroll horizontal
- [ ] Page catégorie avec grille produits
- [ ] Page détail produit
- [ ] Composants : ProductCard, ProductGrid, Header, Footer
- [ ] Navigation par catégories
- [ ] Images placeholder (en attendant vraies images)

#### Livrables
- [ ] Homepage fonctionnelle
- [ ] Navigation catégories
- [ ] Fiches produits

#### Validation
- [ ] Homepage affiche produits dynamiquement
- [ ] Clic sur produit → page détail
- [ ] Navigation catégories fonctionne

---

### ✅ Checkpoint Semaine 1

| Critère | Status |
|---------|--------|
| Projet déployé sur Cloudflare | ⬜ |
| Auth email + 3 OAuth fonctionnels | ⬜ |
| Catalogue produits affiché | ⬜ |
| Navigation complète | ⬜ |

---

## 📅 Semaine 2 : E-commerce Core (6 - 12 fév)

### Objectif
Panier + Checkout + Gestion commandes

### Jour 8-9 : Panier (6-7 fév)

#### Tâches
- [ ] Store Zustand pour panier (état local)
- [ ] Sync panier avec KV (persistance serveur)
- [ ] Merge panier anonyme → authentifié
- [ ] Actions : ajouter, modifier quantité, supprimer
- [ ] Drawer panier (slide from right)
- [ ] Page `/cart` complète
- [ ] Calcul sous-total, frais livraison
- [ ] Sélection variantes sur page produit

#### Livrables
- [ ] Panier fonctionnel
- [ ] Persistance cross-session
- [ ] UI drawer + page

#### Validation
- [ ] Ajouter produit → badge panier update
- [ ] Fermer navigateur → panier conservé
- [ ] Variantes sélectionnables

---

### Jour 10 : Codes Promo (8 fév)

#### Tâches
- [ ] Table promo_codes en DB
- [ ] API validation code promo
- [ ] Types : pourcentage, montant fixe
- [ ] Conditions : min achat, dates validité, catégories
- [ ] UI application code dans panier
- [ ] Affichage réduction

#### Livrables
- [ ] Système promo complet
- [ ] Validation temps réel

#### Validation
- [ ] Code valide → réduction appliquée
- [ ] Code invalide → message erreur
- [ ] Conditions respectées

---

### Jour 11-12 : Checkout (9-10 fév)

#### Tâches
- [ ] Page checkout multi-étapes ou single page
- [ ] Formulaire adresse livraison
- [ ] Sélection zone livraison (calcul frais)
- [ ] Récapitulatif commande
- [ ] Confirmation paiement à la livraison
- [ ] Création commande en DB
- [ ] Génération numéro commande unique
- [ ] Page confirmation avec récap

#### Livrables
- [ ] Checkout complet
- [ ] Commande créée en DB

#### Validation
- [ ] Parcours complet : panier → checkout → confirmation
- [ ] Commande visible en DB
- [ ] Numéro commande généré

---

### Jour 13-14 : Recherche & Filtres (11-12 fév)

#### Tâches
- [ ] Recherche full-text (LIKE ou FTS5)
- [ ] Page résultats recherche
- [ ] Filtres : catégorie, marque, prix min/max
- [ ] Tri : pertinence, prix, nouveauté
- [ ] UI filtres (bottom sheet mobile)
- [ ] Pagination "Charger plus"
- [ ] Autocomplete suggestions

#### Livrables
- [ ] Recherche fonctionnelle
- [ ] Filtres combinables
- [ ] UX mobile optimisée

#### Validation
- [ ] Recherche "iPhone" → résultats pertinents
- [ ] Filtres se combinent correctement
- [ ] Pagination fonctionne

---

### ✅ Checkpoint Semaine 2

| Critère | Status |
|---------|--------|
| Panier persistant fonctionnel | ⬜ |
| Checkout complet | ⬜ |
| Commandes créées en DB | ⬜ |
| Recherche + filtres | ⬜ |
| Codes promo | ⬜ |

---

## 📅 Semaine 3 : Admin & Notifications (13 - 19 fév)

### Objectif
Back-office complet + Notifications + Espace client

### Jour 15-16 : Back-office Produits (13-14 fév)

#### Tâches
- [ ] Layout admin (sidebar, header)
- [ ] Dashboard KPIs (stats basiques)
- [ ] Liste produits avec recherche/filtres
- [ ] CRUD produit complet
- [ ] Gestion variantes (ajout, modif, suppression)
- [ ] Upload images vers R2
- [ ] Gestion catégories
- [ ] Import CSV produits (mise à jour en masse)

#### Livrables
- [ ] Admin produits complet
- [ ] Upload images fonctionnel

#### Validation
- [ ] Créer un produit avec variantes
- [ ] Uploader des images
- [ ] Modifier/supprimer produit

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
- [ ] Page profil (modifier infos)
- [ ] Gestion adresses (CRUD)
- [ ] Historique commandes
- [ ] Détail commande + suivi statut
- [ ] Wishlist (liste de souhaits)
- [ ] Système avis produits
- [ ] Page réinitialisation mot de passe

#### Livrables
- [ ] Espace client complet
- [ ] Avis produits

#### Validation
- [ ] Modifier son profil
- [ ] Voir historique commandes
- [ ] Laisser un avis

---

### ✅ Checkpoint Semaine 3

| Critère | Status |
|---------|--------|
| Back-office produits | ⬜ |
| Back-office commandes | ⬜ |
| Emails transactionnels | ⬜ |
| WhatsApp notifications | ⬜ |
| Espace client complet | ⬜ |
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
| S1 | 25 | 14 | 56% |
| S2 | 22 | - | - |
| S3 | 24 | - | - |
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
