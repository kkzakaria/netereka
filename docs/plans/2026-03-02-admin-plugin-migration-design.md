# Design — Migration vers le plugin Admin de better-auth

**Date :** 2026-03-02
**Statut :** Approuvé

## Contexte

Le projet utilisait une gestion des rôles et de l'activation des comptes entièrement custom (SQL manuel). L'action `toggleCustomerActive` était un no-op (la colonne `is_active` n'existe pas dans la table better-auth). L'objectif est d'adopter le plugin `admin` de better-auth pour corriger ces manques, tout en introduisant une distinction stricte entre les clients boutique et le staff interne.

## Rôles

Quatre rôles distincts, table unique `user` (better-auth) :

| Rôle | Population | Accès admin |
|------|-----------|-------------|
| `customer` | Client boutique | Aucun |
| `agent` | Livreur / support | Dashboard, Commandes, Clients (lecture) |
| `admin` | Employé interne | Accès complet sauf gestion rôles |
| `super_admin` | Administrateur principal | Accès complet + gestion rôles + création comptes |

## Base de données

Migration Drizzle — 3 nouvelles colonnes sur la table `user` :

```sql
ALTER TABLE user ADD COLUMN banned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user ADD COLUMN banReason TEXT;
ALTER TABLE user ADD COLUMN banExpires TEXT;
```

## Configuration better-auth

Dans `lib/auth/index.ts` :
- Ajouter le plugin `admin` avec `defaultRole: "customer"` et `adminRole: ["admin", "super_admin"]`
- Retirer `role` de `user.additionalFields` (pris en charge par le plugin)

## Guards d'authentification

Trois niveaux dans `lib/auth/guards.ts` :

| Guard | Rôles acceptés | Usage |
|-------|---------------|-------|
| `requireAnyAdmin()` | `agent \| admin \| super_admin` | Dashboard, commandes, clients |
| `requireAdmin()` | `admin \| super_admin` | Produits, catégories, bannières, audit-log |
| `requireSuperAdmin()` | `super_admin` | Gestion utilisateurs, rôles, création comptes |

`requireAuth()` et `getOptionalSession()` restent inchangés.

## Actions serveur

### `updateCustomerRole` → `auth.api.setRole`
- Réservé `super_admin`
- Interdit `customer → admin/super_admin` (la promotion d'un client boutique en staff est supprimée)
- Autorise `agent ↔ admin ↔ super_admin`
- Interdit l'auto-rétrogradation
- Audit log maintenu

### `toggleCustomerActive` → `banUser`/`unbanUser`
- Remplace le no-op par `auth.api.banUser` (révoque les sessions actives)
- Accessible aux `admin` et `super_admin`
- `banReason` optionnel (sans saisie UI dans un premier temps)
- Audit log maintenu

### Nouvelle action `createAdminUser`
- `super_admin` uniquement
- Champs : `name`, `email`, `password` (temporaire), `role` (`agent | admin | super_admin`)
- Compte créé directement actif, pas d'email de vérification
- Pas de `phone` requis (staff ≠ client boutique)

## UI

### Page `/users`
- Bouton "Nouvel administrateur" (super_admin uniquement) → dialog de création
- Filtre par rôle : `agent | admin | super_admin`
- Badge `Banni` dans la liste

### Page `/users/[id]`
- Sélecteur de rôle : `agent | admin | super_admin` uniquement
- Bouton ban/unban fonctionnel

### Page `/customers/[id]`
- Suppression du sélecteur de rôle (plus de promotion client → staff)
- Bouton ban/unban fonctionnel (remplace le no-op)

### Sidebar admin
- Agents : Dashboard, Commandes, Clients uniquement
- Admin/Super_admin : menu complet
