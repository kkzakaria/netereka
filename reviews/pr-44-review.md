# Code Review — PR #44: feat: add privacy policy page

## Résumé

Cette PR ajoute une page de politique de confidentialité en français (`/politique-confidentialite`) et l'intègre correctement dans le site : lien dans le footer, renvoi depuis les CGV (section 9), et ajout au sitemap. Le contenu juridique est adapté au contexte ivoirien et aux services techniques utilisés (Cloudflare, Resend).

**Verdict : Approve avec suggestions mineures**

---

## Points positifs

1. **Cohérence structurelle** — La page reprend exactement le même pattern que `conditions-generales/page.tsx` : même layout (`max-w-3xl`), même structure de métadonnées, même utilisation de `SITE_NAME`/`SITE_URL` depuis les constants, même classes CSS pour la prose.

2. **Intégration complète** — Les 4 fichiers modifiés couvrent tout ce qui est nécessaire :
   - Page elle-même avec metadata SEO et canonical URL
   - Lien croisé depuis les CGV (section 9 → politique de confidentialité)
   - Ajout dans le footer (section "Légal")
   - Ajout dans le sitemap avec `priority: 0.3` et `changeFrequency: "monthly"` (cohérent avec les CGV)

3. **Contenu juridique pertinent** — Les sections couvrent les points essentiels (données collectées, base légale, durée de conservation, droits des utilisateurs, cookies, sécurité). Les informations techniques sont exactes (Cloudflare pour l'hébergement, Resend pour les emails, session de 7 jours, Turnstile pour le captcha).

4. **Liens internes** — Bons renvois vers `/account` et `/contact` pour l'exercice des droits, ce qui est utile pour l'utilisateur final.

---

## Suggestions et remarques

### 1. Absence de JSON-LD structured data (faible priorité)

La page `a-propos/page.tsx` inclut un schema JSON-LD (`JsonLd` component). Ce n'est pas obligatoire pour une page de politique de confidentialité, mais pour la cohérence SEO, un schema `WebPage` basique pourrait être ajouté.

**Fichier :** `app/(storefront)/politique-confidentialite/page.tsx`

Ce n'est pas bloquant — c'est plutôt un "nice to have" pour la cohérence.

### 2. `SITE_URL` affiché comme texte dans la section 1

```tsx
<Link href="/" className="text-primary hover:underline">
  {SITE_URL}
</Link>
```

`SITE_URL` vaut `"https://netereka.com"`, donc l'utilisateur verra le lien `https://netereka.com` dans le texte. Dans un contexte juridique, c'est correct (on veut explicitement montrer le domaine). Pas de problème ici — c'est juste une observation que le choix est intentionnel.

### 3. Pas de mention de l'ARTCI (Autorité de Régulation)

En Côte d'Ivoire, la protection des données personnelles est régie par la loi n°2013-450 et supervisée par l'ARTCI (Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire). La section 7 ("Vos droits") dit :

> Conformément à la réglementation en vigueur en Côte d'Ivoire

Il pourrait être utile de mentionner explicitement la loi n°2013-450 relative à la protection des données à caractère personnel et le droit de saisir l'ARTCI en cas de litige. Ce n'est pas un problème de code, mais une suggestion de contenu juridique.

### 4. Pas de page `robots.ts` à mettre à jour

Vérifié : `robots.ts` n'a pas de logique de blocage spécifique par page, donc pas besoin de modification. OK.

---

## Vérifications effectuées

| Point de contrôle | Statut |
|---|---|
| Structure des fichiers cohérente avec le codebase | ✅ |
| Imports corrects (`SITE_NAME`, `SITE_URL`, `Link`) | ✅ |
| Metadata SEO (title, description, canonical) | ✅ |
| Sitemap mis à jour | ✅ |
| Footer mis à jour | ✅ |
| Lien croisé depuis les CGV | ✅ |
| Pas de `"use client"` inutile (page statique, Server Component) | ✅ |
| Pas de faille de sécurité | ✅ |
| Cohérence des classes CSS avec les pages existantes | ✅ |
| Pas de données en dur qui devraient être dans les constants | ✅ |

---

## Conclusion

PR propre et bien intégrée. Les 4 fichiers modifiés sont les bons, le contenu est pertinent pour le marché ivoirien, et la structure du code est cohérente avec le reste du codebase. Les suggestions ci-dessus sont mineures et non bloquantes.

**Recommendation : ✅ Approve**
