# LCP Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce LCP from 5.0 s (red) to < 2.5 s (green) on mobile slow-4G by eliminating the root cause (CSS bloat in RSC flight data) and reducing hydration work.

**Architecture:** The root cause is `inlineCss: true` in `next.config.ts`, which serializes ~100 KB of Tailwind CSS into RSC flight data. This inflates the HTML from ~15 KB to 208 KB uncompressed (55 KB brotli), pushing the banner `<img>` tag to 98.9% through the stream. Removing this flag is the highest-impact single change. Secondary wins: fix a redundant `preload()` call in `page.tsx` (appears at 97% of HTML, after the `<img>` itself — useless), align srcset widths in `refreshHeroPreload()` with Next.js deviceSizes, add immutable cache headers for `/_next/static/` assets, and refactor `HorizontalSection` to push the client-boundary to just the scroll container (reduces hydration work that causes 490 ms element render delay).

**Tech Stack:** Next.js 16.1 App Router, TypeScript 5, Cloudflare Workers / OpenNext, Vitest 4, Tailwind CSS 4, Drizzle ORM + D1, KV (hero preload cache).

---

## LCP diagnosis recap

| Metric | Before | Target |
|---|---|---|
| HTML size (uncompressed) | 208 KB | ~50 KB |
| Banner `<img>` position in HTML stream | 98.9% | ~20% |
| Resource load delay | 460 ms | ~0 ms (Link header at TTFB) |
| Element render delay | 490 ms | <100 ms |
| LCP | 5.0 s 🔴 | <2.5 s 🟢 |

---

## Task 1: Remove `inlineCss: true` and add static asset cache headers

**Files:**
- Modify: `next.config.ts`

**Context:** `inlineCss: true` is an experimental Next.js flag that serializes the entire compiled CSS into the RSC flight data (`self.__next_f.push(...)` inline scripts). This adds ~100 KB to every SSR response. Without it, CSS is served as separate `/_next/static/css/*.css` files with their own preload hints in `<head>`. The `/_next/static/` paths have content-addressed filenames (hash in filename) so they are safe to cache for 1 year with `immutable`.

### Step 1: Remove `inlineCss: true`

Edit `next.config.ts:24-29` — remove the `inlineCss: true` line:

```typescript
// BEFORE
experimental: {
  inlineCss: true,
  optimizePackageImports: ["@hugeicons/core-free-icons", "@hugeicons/react"],
  serverActions: {
    bodySizeLimit: "6mb",
  },
},

// AFTER
experimental: {
  optimizePackageImports: ["@hugeicons/core-free-icons", "@hugeicons/react"],
  serverActions: {
    bodySizeLimit: "6mb",
  },
},
```

### Step 2: Add `/_next/static/` immutable cache header

Edit `next.config.ts` — add a new entry in the `headers()` return array:

```typescript
async headers() {
  return [
    {
      source: "/:path*",
      headers: securityHeaders,
    },
    {
      source: "/_next/static/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ];
},
```

### Step 3: Type-check

Run: `npx tsc --noEmit`
Expected: No errors

### Step 4: Commit

```bash
git add next.config.ts
git commit -m "perf: remove inlineCss flag and add immutable cache for static assets"
```

---

## Task 2: Remove redundant `preload()` from homepage

**Files:**
- Modify: `app/(storefront)/page.tsx`

**Context:** `page.tsx` currently calls `preload()` from `react-dom` to hint the browser about the first banner image. In Next.js App Router with RSC, this `preload()` call emits a `<link rel=preload>` element that ends up **at 97% through the HTML body** (inside the RSC flight data stream), which is useless — the browser has already found the `<img>` tag at 98.9%. The middleware `Link` response header already handles this correctly at TTFB with zero HTML dependency. This task removes the dead code.

### Step 1: Remove the dead `preload()` code from `page.tsx`

Remove these items from `app/(storefront)/page.tsx`:

1. The import: `import { preload } from "react-dom";`
2. The `getImageUrl` import (only used in the `firstBannerSrc` block)
3. The `heroCfSrcSet` function (lines 20-25)
4. The `firstBannerSrc` variable declaration (lines 63-67)
5. The `if (firstBannerSrc) { preload(...) }` block (lines 69-78)

The resulting file should have no references to `preload`, `heroCfSrcSet`, `getImageUrl`, or `firstBannerSrc`.

### Step 2: Type-check

Run: `npx tsc --noEmit`
Expected: No errors

### Step 3: Run tests to verify nothing broke

Run: `npm run test`
Expected: All tests pass

### Step 4: Commit

```bash
git add "app/(storefront)/page.tsx"
git commit -m "perf: remove redundant preload() call — middleware Link header handles this at TTFB"
```

---

## Task 3: Fix srcset widths in `refreshHeroPreload()` to match Next.js deviceSizes

**Files:**
- Modify: `actions/admin/banners.ts`
- Modify: `__tests__/unit/actions/admin-banners.test.ts`

**Context:** The KV-cached Link preload header uses srcset widths `[256, 384, 640, 828, 1080]`. The hero banner `<Image>` uses `sizes="(max-width: 640px) 44vw, (max-width: 1024px) 45vw, 40vw"` with a custom Cloudflare loader. Next.js generates the actual `<img srcset>` from its `imageSizes` + `deviceSizes` defaults: `[16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]`. The preload hint's `imagesrcset` must contain the same width that the browser would pick from the actual srcset — otherwise the preload is wasted. Missing widths:

- **750w**: tablet viewport 768 px × DPR 2 × 45% = 691 px → browser picks `750w` from actual srcset, but our hint only has `640w` → cache miss
- **1200w**: desktop Retina 1440 px × DPR 2 × 40% = 1152 px → browser picks `1200w`, our hint picks `1080w` → cache miss

### Step 1: Write a failing test

Add to `__tests__/unit/actions/admin-banners.test.ts` — a new `describe` block after the existing ones:

```typescript
// ─── refreshHeroPreload (via reorderBanners) ──────────────────────────────────

describe("refreshHeroPreload: Link header srcset widths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("inclut 750w et 1200w dans le srcset du header Link", async () => {
    // Set up findFirst to return a banner with an image so refreshHeroPreload
    // writes to KV rather than deleting the key.
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.dbUpdate.mockReturnValue({ set: setMock });

    mocks.findFirst.mockResolvedValue({ image_url: "banners/hero.jpg" });
    mocks.getDrizzle.mockResolvedValue({
      update: mocks.dbUpdate,
      query: {
        banners: { findFirst: mocks.findFirst },
      },
    });

    await reorderBanners([1]);

    // kvPut should have been called with the Link header value
    expect(mocks.kvPut).toHaveBeenCalledTimes(1);
    const [key, value] = mocks.kvPut.mock.calls[0] as [string, string];
    expect(key).toBe("hero:lcp:preload-url");
    expect(value).toContain("750w");
    expect(value).toContain("1200w");
  });
});
```

### Step 2: Run the test to verify it fails

Run: `npm run test -- --reporter=verbose __tests__/unit/actions/admin-banners.test.ts`
Expected: FAIL — `expect(value).toContain("750w")` fails (750 not in current srcset)

### Step 3: Add 750 and 1200 to srcset widths in `refreshHeroPreload()`

Edit `actions/admin/banners.ts:48`:

```typescript
// BEFORE
const srcset = [256, 384, 640, 828, 1080].map((w) => `${cfUrl(w)} ${w}w`).join(", ");

// AFTER
const srcset = [256, 384, 640, 750, 828, 1080, 1200].map((w) => `${cfUrl(w)} ${w}w`).join(", ");
```

### Step 4: Run test to verify it passes

Run: `npm run test -- --reporter=verbose __tests__/unit/actions/admin-banners.test.ts`
Expected: PASS

### Step 5: Run full test suite

Run: `npm run test`
Expected: All tests pass

### Step 6: Commit

```bash
git add actions/admin/banners.ts __tests__/unit/actions/admin-banners.test.ts
git commit -m "perf: add 750w and 1200w to hero preload Link header srcset"
```

---

## Task 4: Refactor `HorizontalSection` to move client boundary to scroll wrapper only

**Files:**
- Create: `components/storefront/scroll-container.tsx`
- Modify: `components/storefront/horizontal-section.tsx`

**Context:** `HorizontalSection` is currently `"use client"`, which means it (and everything it renders, including `ProductCard`) is bundled as client JavaScript and needs to be hydrated on load. The page has 2 featured + 2 category sections × ~10 products = ~40 `ProductCard` + `ProductCardActions` components hydrating on mount. This causes the 490 ms element render delay (main thread busy).

The fix: extract only the scroll/drag logic into a new `ScrollContainer` client component. `HorizontalSection` becomes a server component and passes `<ProductCard>` children to `ScrollContainer`. In Next.js App Router, server component children passed to a client component are serialized as RSC payload — they are NOT bundled as client JS. `ProductCard` itself has no `"use client"` directive, so it remains a server component. Only `ProductCardActions` (already a client component, small) stays in the client bundle.

**Before:**
```
HorizontalSection (client) → ProductCard (bundled as client) → ProductCardActions (client)
```

**After:**
```
HorizontalSection (server) → ScrollContainer (client, just scroll logic) → children (RSC payload)
ProductCard stays server-rendered, not bundled as client JS
```

### Step 1: Create `components/storefront/scroll-container.tsx`

```typescript
"use client";

import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";
import { ScrollButtons } from "@/components/storefront/scroll-buttons";

export function ScrollContainer({ children }: { children: React.ReactNode }) {
  const { scrollRef, canScrollLeft, canScrollRight, scroll, dragProps } =
    useHorizontalScroll();

  return (
    <div className="group relative">
      <ScrollButtons
        canScrollLeft={canScrollLeft}
        canScrollRight={canScrollRight}
        onScroll={scroll}
      />
      <div
        ref={scrollRef}
        {...dragProps}
        className="flex cursor-grab select-none gap-3 overflow-x-auto pb-2 scrollbar-none active:cursor-grabbing sm:gap-4"
      >
        {children}
      </div>
    </div>
  );
}
```

### Step 2: Rewrite `components/storefront/horizontal-section.tsx` as a server component

```typescript
import Link from "next/link";
import type { ProductCardData } from "@/lib/db/types";
import { ProductCard } from "@/components/storefront/product-card";
import { ScrollContainer } from "@/components/storefront/scroll-container";

export function HorizontalSection({
  title,
  href,
  products,
}: {
  title: string;
  href?: string;
  products: ProductCardData[];
}) {
  if (products.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        {href ? (
          <Link
            href={href}
            className="text-sm font-medium text-primary hover:underline"
          >
            Voir tout
          </Link>
        ) : null}
      </div>
      <ScrollContainer>
        {products.map((product) => (
          <div key={product.id} className="w-[160px] shrink-0 sm:w-[200px]">
            <ProductCard product={product} />
          </div>
        ))}
      </ScrollContainer>
    </section>
  );
}
```

Note: the `"use client"` directive and all hook imports are removed from `horizontal-section.tsx`. The `ScrollContainer` import replaces the inline scroll logic.

### Step 3: Type-check

Run: `npx tsc --noEmit`
Expected: No errors

### Step 4: Verify the dev build renders correctly

Run: `npm run dev`
Open http://localhost:3000 — verify:
- All 4 horizontal sections render with product cards
- Scroll buttons appear on hover
- Drag-to-scroll works
- No console errors

### Step 5: Run tests

Run: `npm run test`
Expected: All tests pass

### Step 6: Commit

```bash
git add components/storefront/scroll-container.tsx components/storefront/horizontal-section.tsx
git commit -m "perf: move HorizontalSection client boundary to ScrollContainer — ProductCard is now RSC"
```

---

## After all tasks: deploy and retest

### Deploy

```bash
npm run deploy
```

### Retest LCP

1. Open https://pagespeed.web.dev/
2. Enter `https://netereka.ci/` → Analyze
3. Verify:
   - **LCP < 2.5 s** (green)
   - **HTML size in Network tab** significantly smaller (~50 KB uncompressed vs 208 KB)
   - **Resource load delay** near 0 ms (Link header preloads at TTFB)
   - **Element render delay** reduced (less hydration work)

### Expected outcomes

| Metric | Before | Expected After |
|---|---|---|
| HTML uncompressed | 208 KB | ~50 KB |
| CSS delivery | Inline in RSC (late) | `<link rel=preload>` in `<head>` (immediate) |
| Resource load delay | 460 ms | ~0 ms |
| Element render delay | 490 ms | <100 ms |
| LCP | 5.0 s 🔴 | <2.5 s 🟢 |
