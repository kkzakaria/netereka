# Cloudflare Image Loader Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer le loader Next.js `/_next/image` (qui ne peut pas utiliser Sharp sur Cloudflare Workers) par un custom loader qui génère des URLs `/cdn-cgi/image/...` traitées nativement par Cloudflare Image Resizing.

**Architecture:** Un fichier loader exportant une fonction `(src, width, quality) → url`. En dev, retourne `src` inchangé. En prod, génère `/cdn-cgi/image/width=W,quality=Q,format=auto/{src}`. Le fichier est déclaré dans `next.config.ts` via `images.loaderFile`. Aucun composant modifié.

**Tech Stack:** Next.js custom image loader, Cloudflare Image Resizing (`/cdn-cgi/image/`), Vitest

---

### Task 1 : Branche de travail

**Files:**
- Aucun

**Step 1 : Créer la branche**

```bash
git checkout main && git pull
git checkout -b feat/cloudflare-image-loader
```

**Step 2 : Vérifier qu'on est sur la bonne branche**

```bash
git branch --show-current
```
Expected output : `feat/cloudflare-image-loader`

---

### Task 2 : Tests du loader

**Files:**
- Create: `__tests__/unit/cloudflare-image-loader.test.ts`

**Step 1 : Écrire les tests**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import cloudflareImageLoader from "@/lib/utils/cloudflare-image-loader";

describe("cloudflareImageLoader", () => {
  describe("en développement (NODE_ENV=development)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("retourne src inchangé pour une URL absolue", () => {
      expect(
        cloudflareImageLoader({
          src: "https://r2.netereka.ci/products/iphone.jpg",
          width: 640,
          quality: 75,
        })
      ).toBe("https://r2.netereka.ci/products/iphone.jpg");
    });

    it("retourne src inchangé pour un chemin relatif", () => {
      expect(
        cloudflareImageLoader({ src: "/images/placeholder.webp", width: 40 })
      ).toBe("/images/placeholder.webp");
    });
  });

  describe("en production (NODE_ENV=production)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("génère une URL CF pour une URL R2 absolue", () => {
      expect(
        cloudflareImageLoader({
          src: "https://r2.netereka.ci/products/iphone.jpg",
          width: 640,
          quality: 75,
        })
      ).toBe(
        "/cdn-cgi/image/width=640,quality=75,format=auto/https://r2.netereka.ci/products/iphone.jpg"
      );
    });

    it("utilise quality=75 par défaut", () => {
      expect(
        cloudflareImageLoader({
          src: "https://r2.netereka.ci/products/img.jpg",
          width: 320,
        })
      ).toBe(
        "/cdn-cgi/image/width=320,quality=75,format=auto/https://r2.netereka.ci/products/img.jpg"
      );
    });

    it("génère une URL CF pour un chemin relatif (supprime le slash initial)", () => {
      expect(
        cloudflareImageLoader({
          src: "/images/placeholder.webp",
          width: 40,
          quality: 75,
        })
      ).toBe("/cdn-cgi/image/width=40,quality=75,format=auto/images/placeholder.webp");
    });

    it("respecte la quality passée en paramètre", () => {
      expect(
        cloudflareImageLoader({
          src: "https://r2.netereka.ci/banners/hero.jpg",
          width: 1200,
          quality: 90,
        })
      ).toBe(
        "/cdn-cgi/image/width=1200,quality=90,format=auto/https://r2.netereka.ci/banners/hero.jpg"
      );
    });

    it("gère les chemins relatifs sans slash initial", () => {
      expect(
        cloudflareImageLoader({
          src: "images/logo.png",
          width: 140,
          quality: 75,
        })
      ).toBe("/cdn-cgi/image/width=140,quality=75,format=auto/images/logo.png");
    });
  });
});
```

**Step 2 : Vérifier que les tests échouent**

```bash
npm run test -- cloudflare-image-loader
```
Expected : FAIL — `Cannot find module '@/lib/utils/cloudflare-image-loader'`

---

### Task 3 : Implémenter le loader

**Files:**
- Create: `lib/utils/cloudflare-image-loader.ts`

**Step 1 : Créer le fichier**

```typescript
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (process.env.NODE_ENV === "development") {
    return src;
  }

  const params = `width=${width},quality=${quality ?? 75},format=auto`;
  const path = src.startsWith("/") ? src.slice(1) : src;
  return `/cdn-cgi/image/${params}/${path}`;
}
```

**Step 2 : Relancer les tests**

```bash
npm run test -- cloudflare-image-loader
```
Expected : 7 tests PASS

**Step 3 : Commit**

```bash
git add __tests__/unit/cloudflare-image-loader.test.ts lib/utils/cloudflare-image-loader.ts
git commit -m "feat(images): add Cloudflare Image Resizing custom loader"
```

---

### Task 4 : Brancher le loader dans Next.js

**Files:**
- Modify: `next.config.ts`

**Step 1 : Modifier `next.config.ts`**

Remplacer le bloc `images` existant :

```typescript
// AVANT
images: {
  formats: ["image/avif", "image/webp"],
  minimumCacheTTL: 2592000,
  remotePatterns: [
    { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    { protocol: "https", hostname: "netereka.ci" },
    { protocol: "https", hostname: "*.netereka.ci" },
    { protocol: "https", hostname: "pub-*.r2.dev" },
  ],
},
```

```typescript
// APRÈS
images: {
  loader: "custom",
  loaderFile: "./lib/utils/cloudflare-image-loader.ts",
},
```

`formats` et `remotePatterns` sont ignorés avec un custom loader — Cloudflare gère la négociation de format via `format=auto`.

**Step 2 : Vérifier la compilation TypeScript**

```bash
npx tsc --noEmit
```
Expected : aucune erreur

**Step 3 : Build complet**

```bash
npm run build 2>&1 | tail -20
```
Expected : build OK, `/sitemap.xml` et les pages storefront toujours présents en sortie

**Step 4 : Commit**

```bash
git add next.config.ts
git commit -m "feat(images): plug Cloudflare loader into next.config.ts"
```

---

### Task 5 : PR et déploiement

**Step 1 : Pousser la branche**

```bash
git push -u origin feat/cloudflare-image-loader
```

**Step 2 : Créer la PR**

```bash
gh pr create \
  --title "feat(images): use Cloudflare Image Resizing to fix LCP" \
  --body "$(cat <<'EOF'
## Problème
Next.js \`/_next/image\` utilise Sharp (binaire natif) qui ne tourne pas dans Cloudflare Workers. Les images étaient servies sans redimensionnement ni conversion, causant ~6,7 MB de gaspillage et un LCP de 8,4 s.

## Solution
Custom loader Next.js → URLs \`/cdn-cgi/image/width=W,quality=Q,format=auto/src\` traitées par Cloudflare Image Resizing à l'edge.

- En **développement** : loader passthrough (src inchangé), pas de dépendance CF locale
- En **production** : toutes les images passent par CF Image Resizing → AVIF/WebP auto, redimensionnement au \`width\` exact

## Fichiers
- \`lib/utils/cloudflare-image-loader.ts\` — nouveau loader
- \`next.config.ts\` — \`loaderFile\` ajouté, \`formats\`/\`remotePatterns\` supprimés (ignorés avec custom loader)

## Impact attendu
- LCP : 8,4 s → < 2,5 s
- Score Performance : 67 → ~85+
- Payload images : 6 691 KiB de moins

## Test plan
- [ ] \`npm run build\` passe sans erreur
- [ ] En dev : les images s'affichent normalement (src passthrough)
- [ ] Après déploiement : vérifier via DevTools Network que les images sont servies depuis \`/cdn-cgi/image/...\` en AVIF/WebP
- [ ] Re-tester PageSpeed Insights sur netereka.ci

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3 : Merger**

```bash
gh pr merge --squash --delete-branch --admin
```

---

## Vérification post-déploiement

Ouvrir Chrome DevTools → Network → filtrer sur `cdn-cgi` :

- Chaque requête image doit montrer `https://netereka.ci/cdn-cgi/image/width=...,quality=75,format=auto/...`
- Content-Type des réponses : `image/avif` ou `image/webp`
- Taille des images hero : < 100 KB au lieu de plusieurs MB
- Relancer PageSpeed Insights sur `https://netereka.ci/`
