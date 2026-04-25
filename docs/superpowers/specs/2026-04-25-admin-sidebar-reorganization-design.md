# Admin Sidebar Reorganization

**Date :** 2026-04-25
**Branche :** `feat/admin-sidebar-reorganization`
**Auteur :** brainstorming session (user + Claude Code)

## Contexte et objectif

La sidebar admin (`components/admin/sidebar.tsx`) a grossi à 13 items en liste plate. Les rubriques mélangent quatre familles distinctes :

- **Opérations quotidiennes** : Dashboard, Commandes, Clients, Conversations WA
- **Catalogue / contenu** : Produits, Catégories, Bannières, Boutiques
- **Configuration / intégrations** : Config WhatsApp, Config AI, Analytics WA
- **Administration** : Utilisateurs, Journal d'audit

Cette mise à plat empêche un admin de retrouver rapidement le bon item, et masque la nature « setup rare » de certaines pages (Config AI, Config WhatsApp) versus la nature « usage quotidien » d'autres (Commandes, Conversations WA). Deux items partagent par ailleurs la même icône (`Configuration01Icon`), les rendant indistinguables visuellement.

**Objectif :** introduire 3 sections nommées dans la sidebar pour mieux distinguer les types de tâches d'administration, et différencier visuellement les deux pages de configuration.

**Hors-scope explicite :**
- Pas de collapse/expand par section (KISS).
- Pas de hub `/settings` qui regrouperait les configs (alourdirait la navigation).
- Pas de réorganisation profonde de l'ordre des items dans chaque section.
- Pas de modification des pages elles-mêmes — uniquement la sidebar.

## Structure cible

3 sections, items répartis comme suit (ordre exact préservé dans chaque section) :

```
NETEREKA — Administration
─────────────────────────

OPÉRATIONS
  Dashboard                  (DashboardSquare01Icon)
  Commandes                  (ShoppingBag01Icon)
  Clients                    (UserGroup02Icon)
  Conversations WA           (MessageMultiple02Icon)

GESTION
  Produits                   (Package02Icon)
  Catégories                 (FolderLibraryIcon)
  Bannières                  (Image02Icon)
  Boutiques                  (StoreLocation01Icon)
  Analytics WA               (ChartLineData02Icon)

PARAMÈTRES
  Config WhatsApp            (WhatsappIcon)         — NEW icon
  Config AI                  (AiBrain01Icon)        — NEW icon
  Utilisateurs               (UserSettings01Icon)
  Journal d'audit            (Audit01Icon)
```

L'icône `Configuration01Icon` n'est plus utilisée (les deux items qui la portaient gagnent une icône domain-specific) → l'import est retiré.

## Comportement par rôle

Le filtrage par `minRole` s'applique par item, comme aujourd'hui. La nouveauté : si TOUS les items d'une section sont filtrés pour le rôle courant, la section ENTIÈRE (header inclus) n'est pas rendue. Aucune section ne doit afficher un header sans items.

Concrètement avec les rôles existants :

| Rôle | Sections visibles |
|---|---|
| **agent** | « OPÉRATIONS » uniquement (4 items : Dashboard, Commandes, Clients, Conversations WA) |
| **admin** | Les 3 sections complètes |
| **super_admin** | Les 3 sections complètes (identique à admin — pas de section super_admin-only aujourd'hui) |

Pour `agent`, les sections « GESTION » et « PARAMÈTRES » ne sont pas rendues — pas même leur header. C'est important : un header isolé sans items en-dessous serait pire que la situation actuelle.

## Style des en-têtes

Pattern shadcn standard, non-cliquable :

```tsx
<div className="text-muted-foreground px-3 pt-4 pb-2 text-xs font-medium uppercase tracking-wider">
  {section.label}
</div>
```

Discret (couleur muted), petit caps avec letter-spacing élargi, padding-top de 16px pour donner de l'air entre sections, padding-bottom plus petit pour rester proche des items qui suivent. La première section n'a pas besoin de padding-top supplémentaire — un `pt-2` ou conditionnel sur l'index ferait l'affaire (à voir au plan).

Le composant `SidebarGroupLabel` de shadcn n'est PAS utilisé dans le repo (la sidebar actuelle est custom, pas le pattern shadcn `<Sidebar>` complet) — on crée donc l'élément en JSX directement, pas besoin d'introduire une nouvelle dépendance.

## Architecture du code

Refactor minimal du fichier `components/admin/sidebar.tsx` (le seul fichier modifié) :

```tsx
type NavItem = {
  href: string;
  label: string;
  icon: IconSvgObject;
  minRole: "agent" | "admin" | "super_admin";
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Opérations",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon, minRole: "agent" },
      { href: "/orders", label: "Commandes", icon: ShoppingBag01Icon, minRole: "agent" },
      { href: "/customers", label: "Clients", icon: UserGroup02Icon, minRole: "agent" },
      { href: "/whatsapp/conversations", label: "Conversations WA", icon: MessageMultiple02Icon, minRole: "agent" },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/products", label: "Produits", icon: Package02Icon, minRole: "admin" },
      { href: "/categories", label: "Catégories", icon: FolderLibraryIcon, minRole: "admin" },
      { href: "/banners", label: "Bannières", icon: Image02Icon, minRole: "admin" },
      { href: "/stores", label: "Boutiques", icon: StoreLocation01Icon, minRole: "admin" },
      { href: "/whatsapp/analytics", label: "Analytics WA", icon: ChartLineData02Icon, minRole: "admin" },
    ],
  },
  {
    label: "Paramètres",
    items: [
      { href: "/whatsapp/settings", label: "Config WhatsApp", icon: WhatsappIcon, minRole: "admin" },
      { href: "/ai-settings", label: "Config AI", icon: AiBrain01Icon, minRole: "admin" },
      { href: "/users", label: "Utilisateurs", icon: UserSettings01Icon, minRole: "admin" },
      { href: "/audit-log", label: "Journal d'audit", icon: Audit01Icon, minRole: "admin" },
    ],
  },
];
```

Render :

```tsx
{navSections.map((section, sectionIdx) => {
  const visibleItems = section.items.filter(
    (item) => ROLE_RANK[role] >= ROLE_RANK[item.minRole],
  );
  if (visibleItems.length === 0) return null;

  return (
    <div key={section.label}>
      <div className={cn(
        "text-muted-foreground px-3 pb-2 text-xs font-medium uppercase tracking-wider",
        sectionIdx === 0 ? "pt-2" : "pt-4",
      )}>
        {section.label}
      </div>
      {visibleItems.map((item) => /* same Link rendering as today */)}
    </div>
  );
})}
```

L'`isActive` logic existante (`pathname === item.href || (href !== "/dashboard" && pathname.startsWith(item.href))`) reste inchangée.

## Imports à ajuster

- **Ajouter** : `WhatsappIcon`, `AiBrain01Icon` depuis `@hugeicons/core-free-icons`
- **Retirer** : `Configuration01Icon` (plus utilisé)
- Tous les autres imports inchangés

## Tests

La sidebar est un composant purement présentationnel basé sur le rôle de l'utilisateur — aucun test unitaire existant et aucun ajouté. Vérification manuelle suffit :

- Login en tant que `agent` → seule la section « OPÉRATIONS » est rendue, avec ses 4 items.
- Login en tant que `admin` → les 3 sections sont rendues avec leurs items respectifs.
- Vérifier que `Config WhatsApp` affiche le logo WhatsApp et que `Config AI` affiche le cerveau.
- Hover/active states inchangés.

Si à terme on veut tester la logique de masquage par rôle, ce sera dans un PR séparé qui introduit aussi le pattern de tests pour les composants admin (qui n'existe pas aujourd'hui dans le repo).

## Migration et déploiement

Modification 100% côté front-end client. Aucune migration DB, aucun changement d'API, aucun impact sur le worker WhatsApp.

Pré-commit (tsc + eslint + vitest + migration-safety) doit passer trivialement — aucun fichier de schéma ou de migration touché.

## Décisions explicites (hors-scope)

- ❌ **Pas de collapse/expand** par section — décision UX validée pendant le brainstorming (option B refusée).
- ❌ **Pas de hub `/settings`** — décision UX validée (option C-Q1 refusée).
- ❌ **Pas de réorganisation des items dans chaque section** — l'ordre listé est conservé tel quel.
- ❌ **Pas de tests unitaires** — la sidebar n'a pas de tests aujourd'hui, on ne change pas la convention dans ce PR.
- ❌ **Pas de touch aux pages elles-mêmes** — strictly the sidebar component.
- ❌ **Pas de migration vers le pattern shadcn `<Sidebar>` complet** (il existe un composant beaucoup plus riche dans shadcn — hors-scope, ce serait un refactor de bien plus grande ampleur).
