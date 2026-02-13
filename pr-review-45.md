# Review PR #45 — `feat: add global 404 and 500 error pages`

## Verdict: Approve avec suggestions mineures

La PR ajoute deux fichiers essentiels (`app/not-found.tsx` et `app/global-error.tsx`) qui comblent une lacune importante — l'absence de pages d'erreur globales. Le code est propre et fonctionnel. Quelques suggestions ci-dessous.

---

## Ce qui est bien fait

1. **`global-error.tsx` utilise des styles inline** — C'est la bonne approche. En cas d'erreur 500 au niveau root, les stylesheets Tailwind peuvent ne pas être chargées. Les styles inline garantissent l'affichage.

2. **`not-found.tsx` inclut Header/Footer** — Contrairement aux `not-found.tsx` imbriqués (ex: `app/(storefront)/p/[slug]/not-found.tsx`), la page 404 globale inclut la navigation, ce qui permet à l'utilisateur de continuer à naviguer sur le site.

3. **`lang="fr"` dans `global-error.tsx`** — Cohérent avec le root layout.

4. **Le style du bouton "Retour à l'accueil"** dans `not-found.tsx` est cohérent avec les pages not-found existantes (`rounded-xl bg-primary px-6 py-2.5`).

---

## Suggestions

### 1. Utiliser le composant `Button` dans `not-found.tsx`

Le projet a un composant `Button` (`components/ui/button.tsx`) avec `asChild` et des variantes bien définies. Au lieu de dupliquer les classes :

```tsx
// Actuel
<Link
  href="/"
  className="mt-8 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
>
  Retour à l'accueil
</Link>

// Suggestion — réutilise le design system
import { Button } from "@/components/ui/button";

<Button asChild size="touch">
  <Link href="/" className="mt-8">Retour à l'accueil</Link>
</Button>
```

Cela centralise le style et les futurs changements de design se propageront automatiquement. Cela dit, les autres pages not-found du projet (`p/[slug]/not-found.tsx`, `c/[slug]/not-found.tsx`) utilisent aussi des classes inline — donc c'est cohérent avec l'existant. A considérer dans un refactor futur.

**Sévérité : faible** — pas bloquant.

### 2. `global-error.tsx` — ajouter les états hover/focus au bouton

Le bouton "Réessayer" n'a aucun retour visuel au survol ou au focus clavier :

```tsx
// Ajouter dans le style du bouton :
style={{
  // ... styles existants ...
  transition: "background-color 150ms",
}}
onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#122d5a")}
onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#183C78")}
```

Ou, plus simplement, ajouter `outline` pour l'accessibilité clavier :

```tsx
style={{
  // ... styles existants ...
  outline: "none",
}}
onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #183C78")}
onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
```

**Sévérité : moyenne** — l'accessibilité clavier est importante.

### 3. `global-error.tsx` — pas de gestion du thème sombre

Le composant utilise `backgroundColor: "#fafafa"` et `color: "#111"` en dur. Si l'utilisateur est en mode sombre, la page 500 apparaîtra en blanc — incohérent avec le reste du site.

Options :
- Accepter tel quel (une page 500 est rare et l'inline est justifié)
- Utiliser `prefers-color-scheme` en media query inline :

```tsx
<style dangerouslySetInnerHTML={{ __html: `
  @media (prefers-color-scheme: dark) {
    body { background-color: #0a0a0a !important; color: #fafafa !important; }
  }
`}} />
```

**Sévérité : faible** — acceptable tel quel pour une v1.

### 4. `not-found.tsx` — ajouter un état hover au lien

Le `<Link>` n'a pas de `hover:` ni `transition`. Les autres CTA du projet utilisent `hover:bg-primary/90` :

```tsx
<Link
  href="/"
  className="mt-8 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
>
```

**Sévérité : faible** — cosmétique mais améliore le feedback utilisateur.

### 5. `not-found.tsx` — `min-h-[calc(100dvh-8rem)]` est une valeur magique

Le `8rem` suppose la hauteur combinée du header + footer. Si ces composants changent de taille, cette valeur sera incorrecte.

C'est un problème mineur et commun dans les projets Next.js — pas de solution idéale sans un layout flex sur le parent. A noter pour le futur.

**Sévérité : faible** — acceptable.

### 6. Le paramètre `error` non utilisé dans `global-error.tsx`

Le paramètre `error` est déstructuré dans les props mais jamais utilisé. Ce n'est pas grave (Next.js le requiert dans la signature), mais il serait utile de le logger côté client ou de l'envoyer à un service de monitoring :

```tsx
export default function GlobalError({
  error,
  reset,
}: { ... }) {
  // Utile pour le debugging futur
  console.error("Global error:", error);
  // Ou: reportError(error) si un service de monitoring est ajouté
```

**Sévérité : faible** — suggestion pour le futur.

---

## Résumé

| Point | Sévérité | Bloquant ? |
|-------|----------|------------|
| Utiliser `Button` component | Faible | Non |
| Hover/focus sur bouton global-error | Moyenne | Non |
| Thème sombre global-error | Faible | Non |
| Hover sur lien not-found | Faible | Non |
| Valeur magique `8rem` | Faible | Non |
| Logger l'erreur dans global-error | Faible | Non |

**Aucun point bloquant.** La PR peut être mergée en l'état. Les suggestions sont des améliorations incrémentales qui peuvent être traitées dans un commit séparé.
