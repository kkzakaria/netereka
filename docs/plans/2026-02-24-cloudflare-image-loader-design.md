# Design — Cloudflare Image Resizing Loader

**Date :** 2026-02-24
**Contexte :** PageSpeed Insights signale 6 691 KiB d'économies potentielles sur les images. Le LCP atteint 8,4 s sur mobile.

## Diagnostic

`next/image` route les requêtes vers `/_next/image` qui utilise Sharp pour optimiser les images. Sharp ne tourne pas dans le runtime Cloudflare Workers — les images sont donc servies à leur taille d'origine depuis R2, sans redimensionnement ni conversion AVIF/WebP.

## Solution retenue : custom loader Cloudflare Image Resizing

Next.js expose un `loaderFile` : une fonction `(src, width, quality) → url` appliquée à chaque `<Image>`. On génère des URLs `/cdn-cgi/image/...` que Cloudflare intercepte pour :
- redimensionner au `width` exact demandé par le `sizes` prop
- convertir en AVIF (si supporté) ou WebP
- mettre en cache au CDN edge

## Fichiers impactés

| Fichier | Action |
|---|---|
| `lib/utils/cloudflare-image-loader.ts` | Nouveau — fonction loader |
| `next.config.ts` | Modifier — ajouter `loaderFile` |

Aucun composant modifié.

## Format URL généré

```
/cdn-cgi/image/width={w},quality={q},format=auto/{src}
```

Exemples :
- `https://r2.netereka.ci/products/img.jpg` → `/cdn-cgi/image/width=640,quality=75,format=auto/https://r2.netereka.ci/products/img.jpg`
- `/images/placeholder.webp` → `/cdn-cgi/image/width=40,quality=75,format=auto/images/placeholder.webp`

## Comportement attendu

- LCP image (premier slide hero) : `priority={true}` génère toujours un `<link rel="preload">` avec l'URL CF
- Toutes les images existantes bénéficient du fix sans re-upload
- Cache CDN Cloudflare sur les images redimensionnées
- `sizes` props existants déjà corrects — pas de changement nécessaire
