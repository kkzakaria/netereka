# Google Merchant Center Feed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose `https://netereka.ci/feed.xml`, a Google Shopping product feed generated at request time from D1, so the catalogue can be listed for free in Google Shopping and later used for Shopping Ads.

**Architecture:** Pure, unit-tested builders in `lib/seo/merchant-feed.ts` turn a projected product shape into RSS 2.0 XML with the `g:` namespace. A D1 query `getProductsForFeed()` in `lib/db/products.ts` provides the data (products + grouped images). A `force-dynamic` Route Handler `app/feed.xml/route.ts` wires them together and returns the XML (or HTTP 500 on DB failure — never a partial feed).

**Tech Stack:** Next.js 16 App Router (Route Handler), D1 via `query<>()`, Vitest 4, R2 image URLs via `getImageUrl`.

Spec: `docs/superpowers/specs/2026-06-17-google-merchant-feed-design.md`

---

## File Structure

- **Create** `lib/seo/merchant-feed.ts` — pure builders & helpers (no I/O): `escapeXml`, `stripHtml`, `formatPrice`, `availabilityFor`, `GOOGLE_CATEGORY_MAP`, `googleCategoryFor`, `absolutize`, `FeedProduct` interface, `buildFeedItem`, `buildFeed`.
- **Create** `__tests__/unit/merchant-feed.test.ts` — unit tests for the above.
- **Modify** `lib/db/products.ts` — add `FeedRow` interface + `getProductsForFeed()`.
- **Create** `app/feed.xml/route.ts` — `GET` handler.

Selection rule everywhere: `is_active = 1 AND is_draft = 0` (out-of-stock included). Products with no usable image are excluded at the route and counted.

---

### Task 1: Formatting helpers

**Files:**
- Create: `lib/seo/merchant-feed.ts`
- Test: `__tests__/unit/merchant-feed.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { escapeXml, stripHtml, formatPrice, availabilityFor } from "@/lib/seo/merchant-feed";

describe("escapeXml", () => {
  it("escapes XML-significant characters", () => {
    expect(escapeXml(`A & B < C > "D" 'E'`)).toBe("A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos;");
  });
  it("returns empty string for null/undefined", () => {
    expect(escapeXml(null)).toBe("");
    expect(escapeXml(undefined)).toBe("");
  });
});

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello&nbsp;<b>world</b></p>\n<p>!</p>")).toBe("Hello world !");
  });
  it("decodes common entities", () => {
    expect(stripHtml("Tom &amp; Jerry &lt;3 &quot;x&quot;")).toBe('Tom & Jerry <3 "x"');
  });
  it("returns empty string for null", () => {
    expect(stripHtml(null)).toBe("");
  });
});

describe("formatPrice", () => {
  it("formats an integer amount as XOF", () => {
    expect(formatPrice(150000)).toBe("150000 XOF");
  });
});

describe("availabilityFor", () => {
  it("is in_stock when quantity > 0", () => {
    expect(availabilityFor(3)).toBe("in_stock");
  });
  it("is out_of_stock when quantity is 0 or less", () => {
    expect(availabilityFor(0)).toBe("out_of_stock");
    expect(availabilityFor(-1)).toBe("out_of_stock");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/merchant-feed.test.ts`
Expected: FAIL — cannot resolve `@/lib/seo/merchant-feed`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/seo/merchant-feed.ts`:

```ts
/** Pure builders for the Google Merchant Center product feed (RSS 2.0 + g: namespace). */

export function escapeXml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatPrice(amount: number): string {
  return `${amount} XOF`;
}

export function availabilityFor(stockQuantity: number): "in_stock" | "out_of_stock" {
  return stockQuantity > 0 ? "in_stock" : "out_of_stock";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/merchant-feed.test.ts`
Expected: PASS (4 describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add lib/seo/merchant-feed.ts __tests__/unit/merchant-feed.test.ts
git commit -m "feat(seo): add merchant-feed formatting helpers"
```

---

### Task 2: Google product category mapping

**Files:**
- Modify: `lib/seo/merchant-feed.ts`
- Test: `__tests__/unit/merchant-feed.test.ts`

Google taxonomy IDs verified against `taxonomy-with-ids.en-US.txt` (2026-06-17).

- [ ] **Step 1: Add the failing test** (append to the test file)

```ts
import { googleCategoryFor } from "@/lib/seo/merchant-feed";

describe("googleCategoryFor", () => {
  it("maps a top-level category slug", () => {
    expect(googleCategoryFor("smartphones", null)).toBe(267);
    expect(googleCategoryFor("ecouteurs", null)).toBe(543626);
  });
  it("falls back to the parent slug when the child is unmapped", () => {
    expect(googleCategoryFor("apple", "smartphones")).toBe(267);
  });
  it("returns undefined for an unmapped category", () => {
    expect(googleCategoryFor("inconnu", null)).toBeUndefined();
    expect(googleCategoryFor(null, null)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/merchant-feed.test.ts -t googleCategoryFor`
Expected: FAIL — `googleCategoryFor` is not exported.

- [ ] **Step 3: Implement** (append to `lib/seo/merchant-feed.ts`)

```ts
/** Internal category slug → Google product category numeric ID.
 *  IDs verified against taxonomy-with-ids.en-US.txt (2026-06-17). */
export const GOOGLE_CATEGORY_MAP: Record<string, number> = {
  smartphones: 267, // Electronics > Communications > Telephony > Mobile Phones
  tablettes: 4745, // Electronics > Computers > Tablet Computers
  ordinateurs: 278, // Electronics > Computers
  televiseurs: 404, // Electronics > Video > Televisions
  televisions: 404,
  ecouteurs: 543626, // Electronics > Audio > ... > Headphones
  "montres-connectees": 201, // Apparel & Accessories > Jewelry > Watches (closest leaf)
  imprimantes: 500106, // Electronics > Print, Copy, Scan & Fax > Printers, Copiers & Fax Machines
  projecteurs: 396, // Electronics > Video > Projectors
  gaming: 1294, // Electronics > Video Game Consoles
  jeux: 1279, // Software > Video Game Software
  reseau: 342, // Electronics > Networking
  accessoires: 2082, // Electronics > Electronics Accessories
};

export function googleCategoryFor(
  categorySlug: string | null | undefined,
  parentCategorySlug: string | null | undefined
): number | undefined {
  if (categorySlug && GOOGLE_CATEGORY_MAP[categorySlug] !== undefined) {
    return GOOGLE_CATEGORY_MAP[categorySlug];
  }
  if (parentCategorySlug && GOOGLE_CATEGORY_MAP[parentCategorySlug] !== undefined) {
    return GOOGLE_CATEGORY_MAP[parentCategorySlug];
  }
  return undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/merchant-feed.test.ts -t googleCategoryFor`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/seo/merchant-feed.ts __tests__/unit/merchant-feed.test.ts
git commit -m "feat(seo): add Google product category mapping"
```

---

### Task 3: URL absolutizer

**Files:**
- Modify: `lib/seo/merchant-feed.ts`
- Test: `__tests__/unit/merchant-feed.test.ts`

- [ ] **Step 1: Add the failing test**

```ts
import { absolutize } from "@/lib/seo/merchant-feed";

describe("absolutize", () => {
  const site = "https://netereka.ci";
  it("leaves absolute http(s) URLs untouched", () => {
    expect(absolutize("https://cdn.example/x.jpg", site)).toBe("https://cdn.example/x.jpg");
  });
  it("prefixes the site URL for root-relative paths", () => {
    expect(absolutize("/images/x.jpg", site)).toBe("https://netereka.ci/images/x.jpg");
  });
  it("returns empty string for empty input", () => {
    expect(absolutize("", site)).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/merchant-feed.test.ts -t absolutize`
Expected: FAIL — `absolutize` not exported.

- [ ] **Step 3: Implement** (append to `lib/seo/merchant-feed.ts`)

```ts
/** Ensure a URL is absolute. `siteUrl` must have no trailing slash. */
export function absolutize(url: string | null | undefined, siteUrl: string): string {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  return url.startsWith("/") ? `${siteUrl}${url}` : `${siteUrl}/${url}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/merchant-feed.test.ts -t absolutize`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/seo/merchant-feed.ts __tests__/unit/merchant-feed.test.ts
git commit -m "feat(seo): add URL absolutizer for feed image links"
```

---

### Task 4: `buildFeedItem`

**Files:**
- Modify: `lib/seo/merchant-feed.ts`
- Test: `__tests__/unit/merchant-feed.test.ts`

`FeedProduct` carries already-absolute image URLs (resolved by the route).

- [ ] **Step 1: Add the failing test**

```ts
import { buildFeedItem, type FeedProduct } from "@/lib/seo/merchant-feed";

const base: FeedProduct = {
  id: "p1",
  slug: "apple-iphone-17",
  name: "Apple iPhone 17 256 Go",
  description: "<p>Super <b>téléphone</b></p>",
  descriptionType: "html",
  shortDescription: null,
  basePrice: 530000,
  comparePrice: null,
  sku: "IPH17-256",
  brand: "Apple",
  stockQuantity: 4,
  categorySlug: "smartphones",
  categoryName: "Smartphones",
  parentCategorySlug: null,
  primaryImage: "https://netereka.ci/img/iphone-1.jpg",
  additionalImages: ["https://netereka.ci/img/iphone-2.jpg"],
};

describe("buildFeedItem", () => {
  it("emits required attributes for a simple in-stock product", () => {
    const xml = buildFeedItem(base, "https://netereka.ci");
    expect(xml).toContain("<g:id>p1</g:id>");
    expect(xml).toContain("<g:title>Apple iPhone 17 256 Go</g:title>");
    expect(xml).toContain("<g:link>https://netereka.ci/p/apple-iphone-17</g:link>");
    expect(xml).toContain("<g:image_link>https://netereka.ci/img/iphone-1.jpg</g:image_link>");
    expect(xml).toContain("<g:additional_image_link>https://netereka.ci/img/iphone-2.jpg</g:additional_image_link>");
    expect(xml).toContain("<g:availability>in_stock</g:availability>");
    expect(xml).toContain("<g:price>530000 XOF</g:price>");
    expect(xml).toContain("<g:brand>Apple</g:brand>");
    expect(xml).toContain("<g:mpn>IPH17-256</g:mpn>");
    expect(xml).toContain("<g:condition>new</g:condition>");
    expect(xml).toContain("<g:google_product_category>267</g:google_product_category>");
    expect(xml).toContain("<g:product_type>Smartphones</g:product_type>");
  });

  it("falls back to stripped description and escapes XML", () => {
    const xml = buildFeedItem(base, "https://netereka.ci");
    expect(xml).toContain("<g:description>Super téléphone</g:description>");
  });

  it("uses short_description when present", () => {
    const xml = buildFeedItem({ ...base, shortDescription: "Court & net" }, "https://netereka.ci");
    expect(xml).toContain("<g:description>Court &amp; net</g:description>");
  });

  it("emits sale_price when compare_price is higher than base_price", () => {
    const xml = buildFeedItem({ ...base, comparePrice: 600000 }, "https://netereka.ci");
    expect(xml).toContain("<g:price>600000 XOF</g:price>");
    expect(xml).toContain("<g:sale_price>530000 XOF</g:sale_price>");
  });

  it("does NOT emit sale_price when compare_price <= base_price", () => {
    const xml = buildFeedItem({ ...base, comparePrice: 530000 }, "https://netereka.ci");
    expect(xml).not.toContain("sale_price");
    expect(xml).toContain("<g:price>530000 XOF</g:price>");
  });

  it("marks out_of_stock when quantity is 0", () => {
    const xml = buildFeedItem({ ...base, stockQuantity: 0 }, "https://netereka.ci");
    expect(xml).toContain("<g:availability>out_of_stock</g:availability>");
  });

  it("emits identifier_exists=no when both brand and sku are absent", () => {
    const xml = buildFeedItem({ ...base, brand: null, sku: null }, "https://netereka.ci");
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
    expect(xml).not.toContain("<g:brand>");
    expect(xml).not.toContain("<g:mpn>");
  });

  it("omits google_product_category for an unmapped category", () => {
    const xml = buildFeedItem({ ...base, categorySlug: "inconnu", parentCategorySlug: null }, "https://netereka.ci");
    expect(xml).not.toContain("google_product_category");
  });

  it("truncates the title to 150 characters", () => {
    const longName = "X".repeat(200);
    const xml = buildFeedItem({ ...base, name: longName }, "https://netereka.ci");
    const match = xml.match(/<g:title>([^<]*)<\/g:title>/);
    expect(match?.[1].length).toBe(150);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/merchant-feed.test.ts -t buildFeedItem`
Expected: FAIL — `buildFeedItem` / `FeedProduct` not exported.

- [ ] **Step 3: Implement** (append to `lib/seo/merchant-feed.ts`)

```ts
export interface FeedProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  descriptionType: string;
  shortDescription: string | null;
  basePrice: number;
  comparePrice: number | null;
  sku: string | null;
  brand: string | null;
  stockQuantity: number;
  categorySlug: string | null;
  categoryName: string | null;
  parentCategorySlug: string | null;
  primaryImage: string; // absolute URL
  additionalImages: string[]; // absolute URLs, already capped
}

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 5000;

function feedDescription(p: FeedProduct): string {
  const short = p.shortDescription?.trim();
  if (short) return short;
  const stripped = stripHtml(p.description);
  return stripped || p.name;
}

export function buildFeedItem(p: FeedProduct, siteUrl: string): string {
  const lines: string[] = [];
  const push = (tag: string, value: string) => lines.push(`    <g:${tag}>${escapeXml(value)}</g:${tag}>`);

  push("id", p.id);
  push("title", p.name.slice(0, TITLE_MAX));
  push("description", feedDescription(p).slice(0, DESCRIPTION_MAX));
  push("link", `${siteUrl}/p/${p.slug}`);
  push("image_link", p.primaryImage);
  for (const img of p.additionalImages) {
    push("additional_image_link", img);
  }
  push("availability", availabilityFor(p.stockQuantity));

  const onSale = p.comparePrice !== null && p.comparePrice > p.basePrice;
  push("price", formatPrice(onSale ? (p.comparePrice as number) : p.basePrice));
  if (onSale) push("sale_price", formatPrice(p.basePrice));

  push("condition", "new");

  if (p.brand) push("brand", p.brand);
  if (p.sku) push("mpn", p.sku);
  if (!p.brand && !p.sku) push("identifier_exists", "no");

  const gpc = googleCategoryFor(p.categorySlug, p.parentCategorySlug);
  if (gpc !== undefined) push("google_product_category", String(gpc));
  if (p.categoryName) push("product_type", p.categoryName);

  return `  <item>\n${lines.join("\n")}\n  </item>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/merchant-feed.test.ts -t buildFeedItem`
Expected: PASS (all `buildFeedItem` cases green).

- [ ] **Step 5: Commit**

```bash
git add lib/seo/merchant-feed.ts __tests__/unit/merchant-feed.test.ts
git commit -m "feat(seo): build per-product Merchant Center feed item"
```

---

### Task 5: `buildFeed` envelope

**Files:**
- Modify: `lib/seo/merchant-feed.ts`
- Test: `__tests__/unit/merchant-feed.test.ts`

- [ ] **Step 1: Add the failing test**

```ts
import { buildFeed } from "@/lib/seo/merchant-feed";

describe("buildFeed", () => {
  it("wraps items in a valid RSS 2.0 channel with the g: namespace", () => {
    const xml = buildFeed(["  <item><g:id>a</g:id></item>"], {
      siteUrl: "https://netereka.ci",
      title: "NETEREKA",
      description: "Boutique",
    });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">');
    expect(xml).toContain("<title>NETEREKA</title>");
    expect(xml).toContain("<link>https://netereka.ci</link>");
    expect(xml).toContain("<g:id>a</g:id>");
    expect(xml.trim().endsWith("</rss>")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/merchant-feed.test.ts -t buildFeed`
Expected: FAIL — `buildFeed` not exported.

- [ ] **Step 3: Implement** (append to `lib/seo/merchant-feed.ts`)

```ts
export function buildFeed(
  items: string[],
  opts: { siteUrl: string; title: string; description: string }
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(opts.title)}</title>
    <link>${escapeXml(opts.siteUrl)}</link>
    <description>${escapeXml(opts.description)}</description>
${items.join("\n")}
  </channel>
</rss>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/unit/merchant-feed.test.ts`
Expected: PASS — whole file green.

- [ ] **Step 5: Commit**

```bash
git add lib/seo/merchant-feed.ts __tests__/unit/merchant-feed.test.ts
git commit -m "feat(seo): assemble RSS 2.0 Merchant Center feed envelope"
```

---

### Task 6: `getProductsForFeed()` query

**Files:**
- Modify: `lib/db/products.ts`

No unit test (DB query; covered by route verification in Task 7). Follows the existing `query<>()` pattern in this file.

- [ ] **Step 1: Add the query and its row type**

Append to `lib/db/products.ts`:

```ts
export interface FeedRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  description_type: string;
  short_description: string | null;
  base_price: number;
  compare_price: number | null;
  sku: string | null;
  brand: string | null;
  stock_quantity: number;
  category_slug: string | null;
  category_name: string | null;
  parent_category_slug: string | null;
  image_urls: string[];
}

/** All active, non-draft products with their images (primary first), for the
 *  Google Merchant Center feed. Out-of-stock products are included. */
export async function getProductsForFeed(): Promise<FeedRow[]> {
  const products = await query<Omit<FeedRow, "image_urls">>(
    `SELECT p.id, p.slug, p.name, p.description, p.description_type, p.short_description,
            p.base_price, p.compare_price, p.sku, p.brand, p.stock_quantity,
            c.slug AS category_slug, c.name AS category_name,
            pc.slug AS parent_category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories pc ON pc.id = c.parent_id
      WHERE p.is_active = 1 AND p.is_draft = 0
      ORDER BY p.created_at DESC`
  );

  const images = await query<{ product_id: string; url: string | null }>(
    `SELECT pi.product_id, pi.url
       FROM product_images pi
       JOIN products p ON p.id = pi.product_id
      WHERE p.is_active = 1 AND p.is_draft = 0 AND pi.variant_id IS NULL
      ORDER BY pi.product_id, pi.is_primary DESC, pi.sort_order ASC`
  );

  const byProduct = new Map<string, string[]>();
  for (const img of images) {
    if (!img.url) continue;
    const arr = byProduct.get(img.product_id) ?? [];
    arr.push(img.url);
    byProduct.set(img.product_id, arr);
  }

  return products.map((p) => ({ ...p, image_urls: byProduct.get(p.id) ?? [] }));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add lib/db/products.ts
git commit -m "feat(db): add getProductsForFeed query for the Merchant feed"
```

---

### Task 7: Route handler + end-to-end verification

**Files:**
- Create: `app/feed.xml/route.ts`

- [ ] **Step 1: Implement the route**

Create `app/feed.xml/route.ts`:

```ts
import { getProductsForFeed } from "@/lib/db/products";
import { absolutize, buildFeed, buildFeedItem, type FeedProduct } from "@/lib/seo/merchant-feed";
import { getImageUrl } from "@/lib/utils/images";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/utils/constants";

// Rendered at request time so the D1 binding (getCloudflareContext) is available.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getProductsForFeed();
    const items: string[] = [];
    let skipped = 0;

    for (const r of rows) {
      const images = r.image_urls
        .map((u) => absolutize(getImageUrl(u), SITE_URL))
        .filter((u) => u.length > 0);

      if (images.length === 0) {
        skipped++;
        continue;
      }

      const product: FeedProduct = {
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        descriptionType: r.description_type,
        shortDescription: r.short_description,
        basePrice: r.base_price,
        comparePrice: r.compare_price,
        sku: r.sku,
        brand: r.brand,
        stockQuantity: r.stock_quantity,
        categorySlug: r.category_slug,
        categoryName: r.category_name,
        parentCategorySlug: r.parent_category_slug,
        primaryImage: images[0],
        additionalImages: images.slice(1, 11),
      };

      items.push(buildFeedItem(product, SITE_URL));
    }

    if (skipped > 0) {
      console.warn(`[feed] ${skipped} produit(s) sans image exclu(s) du flux Merchant Center`);
    }

    const xml = buildFeed(items, {
      siteUrl: SITE_URL,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    });

    return new Response(xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    // Never serve a partial feed: a 500 makes Merchant Center keep the last good feed.
    console.error("[feed] failed to build Merchant Center feed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify the feed live (local dev + local D1)**

Run:
```bash
npm run dev > /tmp/feed-dev.log 2>&1 &
# wait for ready
for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 3 | grep -q 200 && break; sleep 2; done
curl -sS -o /tmp/feed.xml -w "HTTP %{http_code} | %{size_download}b\n" http://localhost:3000/feed.xml
echo "items:"; grep -c "<item>" /tmp/feed.xml
echo "g:price sample:"; grep -o "<g:price>[^<]*</g:price>" /tmp/feed.xml | head -2
echo "g:google_product_category sample:"; grep -o "<g:google_product_category>[^<]*</g:google_product_category>" /tmp/feed.xml | head -2
echo "feed errors in log:"; grep -c "\[feed\]" /tmp/feed-dev.log
```
Expected: HTTP 200; `items` ≈ number of active non-draft products with an image (~231 locally); price values like `530000 XOF`; some `<g:google_product_category>` present; no `[feed] failed` line.

- [ ] **Step 4: Validate XML is well-formed**

Run: `xmllint --noout --nonet /tmp/feed.xml && echo "well-formed XML OK"`
(`--nonet` disables network/external-entity fetching — avoids XXE; libxml2's `xmllint` ships with most systems. If absent, `apt-get install -y libxml2-utils` or skip — the Vitest `buildFeed` test already asserts structure.)
Expected: `well-formed XML OK`.

- [ ] **Step 5: Stop dev server**

Run: `pkill -f "next dev"` (ignore exit code).

- [ ] **Step 6: Commit**

```bash
git add app/feed.xml/route.ts
git commit -m "feat(seo): serve Google Merchant Center feed at /feed.xml"
```

---

### Task 8: Full gate + finalize

- [ ] **Step 1: Run the full pre-commit gate**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: tsc clean, eslint clean, all Vitest tests pass (including the new `merchant-feed.test.ts`).

- [ ] **Step 2: Update the spec status (optional doc touch)**

In `docs/superpowers/specs/2026-06-17-google-merchant-feed-design.md`, change the header `**Statut :**` line to `Implémenté (2026-06-17)`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-06-17-google-merchant-feed-design.md
git commit -m "docs(seo): mark Merchant feed spec as implemented"
```

---

## Post-implementation (manual, out of code)

1. Create a **Google Merchant Center** account; verify and claim `netereka.ci`.
2. Configure **shipping** (Abidjan/COD delivery zones) and **tax** in account settings.
3. Add the feed as a **scheduled fetch**: `https://netereka.ci/feed.xml` (daily).
4. Review and fix any product disapprovals Merchant Center reports.

## Self-Review notes

- **Spec coverage:** route + force-dynamic (Task 7), RSS2/g: namespace (Tasks 4-5), all attribute mappings incl. price/sale_price/availability/identifiers/google_product_category/product_type (Task 4), out-of-stock included + no-image exclusion (Tasks 6-7), DB error → 500 (Task 7), pure tested helpers (Tasks 1-5), getProductsForFeed (Task 6), Vitest plan (Tasks 1-5). All covered.
- **Placeholder scan:** none — every step has concrete code/commands. Google IDs are final (verified values, not "à vérifier").
- **Type consistency:** `FeedProduct` (camelCase, Task 4) used identically in Task 7; `FeedRow` (snake_case, Task 6) mapped to `FeedProduct` in Task 7; helper signatures match across tasks.
