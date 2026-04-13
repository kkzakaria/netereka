# WhatsApp Ordering — Design Spec

## Overview

Canal WhatsApp complet pour NETEREKA Electronic permettant aux clients de parcourir le catalogue, passer commande, suivre leurs livraisons et recevoir des notifications — le tout via une conversation WhatsApp propulsée par un LLM (Gemma 4 sur Workers AI).

## Objectifs

- Permettre la commande de bout en bout via WhatsApp (catalogue → panier → commande → suivi)
- Envoyer des notifications proactives de statut de commande à tous les clients (web et WhatsApp)
- Fournir un dashboard admin pour gérer les conversations, la config API et les analytics
- Intégrer des boutons contextuels WhatsApp dans le storefront (page produit, carte produit, panier)

## Contraintes

- **BSP** : Aucun — connexion directe à Meta Cloud API (WhatsApp)
- **LLM** : Gemma 4 via Cloudflare Workers AI
- **Volume** : <20 commandes/jour au lancement, architecture prévue pour 100+/jour
- **Langue** : Français (principal), anglais si le client écrit en anglais
- **Monnaie** : XOF (FCFA), paiement à la livraison uniquement

---

## Architecture

### Vue d'ensemble

```
┌─────────────┐     ┌──────────────────────────┐     ┌─────────────┐
│  WhatsApp    │────▶│  Cloudflare Worker        │────▶│  D1 / KV    │
│  Cloud API   │◀────│  (webhook + orchestrateur) │◀────│  / R2       │
└─────────────┘     └──────────┬───────────────┘     └─────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │  Workers AI (Gemma 4)     │
                    │  Contexte : catalogue,    │
                    │  panier, commandes        │
                    └──────────────────────────┘
```

### Composants

1. **Worker WhatsApp (`workers/whatsapp/`)** — Cloudflare Worker séparé de l'app Next.js, déployé indépendamment :
   - Réception des webhooks Meta (vérification + messages entrants)
   - Orchestration des appels LLM avec le contexte métier
   - Accès D1 pour les données (produits, commandes, comptes)
   - Envoi des réponses via l'API WhatsApp Cloud
   - Envoi des notifications proactives via Service Binding

2. **Workers AI** — Gemma 4 avec system prompt définissant le rôle d'assistant NETEREKA et les outils disponibles (function calling)

3. **KV** — Contexte conversationnel par numéro WhatsApp (historique des 20 derniers messages, état de la session), TTL 24h

4. **D1** — Base existante partagée. Nouvelles tables pour : config, sessions WhatsApp, paniers, messages log

5. **App Next.js (admin)** — Pages admin pour la config API, le dashboard conversations, et les analytics

### Pourquoi un Worker séparé ?

- Le webhook WhatsApp doit répondre en <5s (exigence Meta)
- Déploiement indépendant : mettre à jour le bot ne redéploie pas le site
- Scaling et isolation des erreurs

### Communication Worker ↔ Next.js

- **Données partagées via D1** — Le Worker lit/écrit dans la même base D1
- **Notifications proactives** — Quand une commande change de statut dans l'app Next.js, appel au Worker WhatsApp via **Service Binding** (pas de HTTP public)

---

## Modèle de données

### Nouvelles tables

#### `whatsapp_config` — Configuration API (une seule ligne)

| Colonne | Type | Description |
|---------|------|-------------|
| id | INTEGER PK | Toujours 1 |
| phone_number_id | TEXT | ID du numéro WhatsApp (Meta) |
| access_token | TEXT | Token d'accès permanent (chiffré) |
| verify_token | TEXT | Token de vérification webhook |
| webhook_secret | TEXT | Secret pour valider les signatures Meta |
| business_account_id | TEXT | ID du compte WhatsApp Business |
| admin_phones | TEXT | JSON array des numéros admin pour les escalades |
| is_active | BOOLEAN | Activer/désactiver le canal |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `whatsapp_sessions` — Liaison numéro WhatsApp ↔ compte NETEREKA

| Colonne | Type | Description |
|---------|------|-------------|
| id | INTEGER PK | |
| wa_phone | TEXT UNIQUE | Numéro WhatsApp normalisé (E.164) |
| user_id | TEXT NULL | FK vers `user.id` (null si pas encore lié) |
| otp_code | TEXT NULL | Code OTP en cours |
| otp_expires_at | TIMESTAMP NULL | Expiration OTP |
| is_verified | BOOLEAN | Compte lié et vérifié |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `whatsapp_carts` — Panier WhatsApp

| Colonne | Type | Description |
|---------|------|-------------|
| id | INTEGER PK | |
| session_id | INTEGER FK | → whatsapp_sessions |
| product_id | INTEGER FK | → products |
| variant_id | INTEGER NULL FK | → product_variants |
| quantity | INTEGER | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `whatsapp_messages` — Log des messages (dashboard + analytics + contexte LLM)

| Colonne | Type | Description |
|---------|------|-------------|
| id | INTEGER PK | |
| session_id | INTEGER FK | → whatsapp_sessions |
| wa_message_id | TEXT | ID message Meta (déduplication) |
| direction | TEXT | "inbound" ou "outbound" |
| content | TEXT | Contenu du message |
| message_type | TEXT | "text", "interactive", "template", "image" |
| metadata | TEXT NULL | JSON (boutons cliqués, template utilisé, etc.) |
| created_at | TIMESTAMP | |

### Stockage du contexte conversationnel (KV)

Clé : `wa:conv:{wa_phone}` — TTL 24h

```json
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "intent": "ordering",
  "last_activity": "2026-04-13T10:30:00Z"
}
```

Derniers 20 messages en KV pour le contexte LLM. Historique complet dans `whatsapp_messages` (D1).

### Tables existantes modifiées

- **`orders`** — Nouveau champ `channel` (TEXT, default "web", valeurs : "web" | "whatsapp")

---

## Logique LLM & système d'outils

### System Prompt

Le LLM est configuré comme assistant commercial de NETEREKA Electronic :
- Répond en français, s'adapte si le client écrit en anglais
- Monnaie XOF (FCFA), paiement à la livraison uniquement
- Ne répond qu'aux sujets liés à NETEREKA (pas de questions générales)
- Ton professionnel, amical, concis — adapté au format WhatsApp (messages courts)

### Outils (function calling)

| Outil | Description | Paramètres |
|-------|-------------|------------|
| `search_products` | Rechercher dans le catalogue | query, category_slug?, limit? |
| `get_product` | Détails d'un produit | product_id ou slug |
| `get_categories` | Lister les catégories | parent_slug? |
| `cart_add` | Ajouter au panier WhatsApp | product_id, variant_id?, quantity |
| `cart_view` | Voir le panier actuel | — |
| `cart_update` | Modifier quantité | item_id, quantity |
| `cart_remove` | Retirer un article | item_id |
| `cart_clear` | Vider le panier | — |
| `create_order` | Passer commande | address, commune, phone, instructions? |
| `get_order_status` | Statut d'une commande | order_number |
| `list_orders` | Historique commandes du client | limit? |
| `get_delivery_zones` | Zones de livraison disponibles | — |
| `link_account` | Lier compte NETEREKA (envoie OTP) | email |
| `verify_otp` | Vérifier le code OTP | code |
| `escalate_human` | Transférer à un humain | reason |

### Flow d'un message entrant

```
Message WhatsApp reçu
        │
        ▼
  Vérifier signature Meta
        │
        ▼
  Trouver/créer session (wa_phone)
        │
        ▼
  Charger contexte KV (derniers 20 messages)
        │
        ▼
  Construire prompt : system + contexte + message
        │
        ▼
  Appel Workers AI (Gemma 4)
        │
        ├── LLM répond texte → Envoyer réponse WhatsApp
        │
        └── LLM appelle un outil → Exécuter l'outil
                │
                ▼
          Résultat outil → Ré-injecter dans le LLM
                │
                ▼
          LLM formule la réponse → Envoyer réponse WhatsApp
        │
        ▼
  Sauvegarder en KV (contexte) + D1 (log)
```

### Gestion des cas limites

- **Compte non lié** : Recherche catalogue et questions OK. Pour commander, liaison requise (auto par téléphone ou OTP)
- **Produit hors stock** : Le LLM informe et propose des alternatives via `search_products`
- **Adresse manquante** : Propose les adresses sauvegardées ou demande les infos étape par étape
- **Timeout LLM** : Si Workers AI ne répond pas en 10s, message d'excuse + retry une fois
- **Messages non textuels** : Images, audio, documents → réponse standard "Je ne peux traiter que des messages texte pour l'instant"
- **Escalade humaine** : Le LLM peut décider de transférer → notification WhatsApp aux admins + notification dashboard

### Formatage des réponses

- Messages courts (max ~300 caractères par bulle)
- Gras (*texte*) pour les prix et noms de produits
- Listes numérotées pour les résultats de recherche
- 1-2 emojis max par message

---

## Notifications proactives

### Templates Meta (pré-approuvés)

| Événement | Template ID | Catégorie | Contenu |
|-----------|-------------|-----------|---------|
| Commande confirmée | `order_confirmed` | Utility | "Votre commande *{order_number}* est confirmée. Montant : *{total} FCFA*. Livraison estimée : {date}." |
| En préparation | `order_preparing` | Utility | "Votre commande *{order_number}* est en cours de préparation." |
| En livraison | `order_shipping` | Utility | "Votre commande *{order_number}* est en route ! Notre livreur vous contactera bientôt." |
| Livrée | `order_delivered` | Utility | "Votre commande *{order_number}* a été livrée. Merci pour votre confiance !" |
| Escalade admin | `escalade_alert` | Utility | "Un client demande une assistance humaine. Numéro : {phone}, Raison : {reason}" |

### Mécanisme de déclenchement

```
Admin change statut commande (server action)
        │
        ▼
  Écriture D1 (orders.status + order_status_history)
        │
        ▼
  Lookup : le client a-t-il une session WhatsApp vérifiée ?
        │
        ├── Oui → Appel Worker WhatsApp via Service Binding → Envoi template
        │
        └── Non → Email uniquement (comportement actuel)
```

Toutes les commandes sont concernées (web et WhatsApp), pas seulement celles passées via WhatsApp.

---

## Intégration storefront — Boutons contextuels

### Page produit (`/p/[slug]`)

- Bouton "Demander sur WhatsApp" sous le bouton "Ajouter au panier"
- Lien : `https://wa.me/{numero}?text=Bonjour, je suis intéressé par {nom_produit} ({prix} FCFA). Ref: {slug}`
- Visible sur tous les produits, mis en avant sur les produits en rupture de stock

### Carte produit (product card)

- Icône WhatsApp dans les actions rapides (à côté du coeur wishlist)
- Même lien `wa.me` avec message pré-rempli

### Page panier

- Bouton "Finaliser via WhatsApp" à côté du bouton "Passer la commande"
- Message pré-rempli avec résumé du panier :
  ```
  Bonjour, je souhaite commander :
  - {produit1} x{qty} ({prix} FCFA)
  - {produit2} x{qty} ({prix} FCFA)
  Total : {total} FCFA
  ```

Ces boutons utilisent des liens `wa.me` classiques (pas l'API). Le message arrive au Worker webhook qui le traite comme tout message entrant.

---

## Admin dashboard

### Configuration WhatsApp (`/admin/whatsapp/settings`)

Formulaire de configuration :
- Phone Number ID, Access Token (masqué/chiffré), Verify Token, Webhook Secret, Business Account ID
- Numéros admin pour les escalades (liste éditable)
- Toggle activer/désactiver
- Bouton "Tester la connexion"

### Dashboard conversations (`/admin/whatsapp/conversations`)

Liste des conversations avec colonnes : Client (nom ou numéro), Dernier message (aperçu + horodatage), Statut (Active/Escalade/Fermée), Compte lié (Oui/Non), Nombre de messages.

Vue détail d'une conversation :
- Historique complet des messages, style chat
- Infos client (nom, email, téléphone, commandes récentes)
- Champ de réponse manuelle (envoyé via l'API WhatsApp)
- Bouton "Fermer la conversation"
- Bouton "Reprendre en mode bot" (après escalade)

### Analytics (`/admin/whatsapp/analytics`)

Métriques sur période sélectionnable (7j, 30j, 90j) :

| Métrique | Description |
|----------|-------------|
| Conversations totales | Sessions uniques |
| Messages entrants/sortants | Volume par jour (graphique) |
| Taux de conversion | % conversations → commande |
| Commandes WhatsApp | Nombre + montant vs web |
| Temps de réponse moyen | Délai message client → réponse bot |
| Escalades | Nombre + raisons fréquentes |
| Top produits demandés | Plus recherchés/commandés via WhatsApp |
| Clients actifs | Numéros uniques actifs sur la période |

Agrégations calculées à la volée sur `whatsapp_messages` et `orders`. Pré-calcul KV possible si le volume augmente.

### Sidebar admin

Nouvelle section :
```
📱 WhatsApp
   ├── Conversations
   ├── Analytics
   └── Configuration
```

Position : après "Clients".

---

## Coûts estimés

| Poste | Coût |
|-------|------|
| WhatsApp (Meta) — conversations | ~1-2 USD/jour (<20 cmd/jour), 1000 conversations Service gratuites/mois |
| Workers AI (Gemma 4) | Free tier suffisant au lancement |
| Cloudflare Worker | Inclus dans le plan |
| D1 / KV | Inclus dans le plan |
| **Total estimé** | **~2-4 USD/jour** |

---

## Authentification — Liaison compte

### Match automatique par téléphone

1. Client envoie un message WhatsApp
2. Le Worker cherche dans `users` un compte avec le même numéro de téléphone (normalisé E.164)
3. Si trouvé → liaison automatique, session marquée `is_verified = true`

### Fallback OTP

1. Si pas de match par téléphone, le bot demande l'email du compte NETEREKA
2. L'outil `link_account` génère un OTP à 6 chiffres, l'envoie par email (Resend)
3. Le client saisit le code dans WhatsApp via `verify_otp`
4. Validation → session liée et vérifiée
