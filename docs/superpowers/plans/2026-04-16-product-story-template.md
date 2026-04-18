# Product Story Template — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a structured, Apple-like product description template (tagline + highlights + feature blocks + FAQ + free content) that replaces the current free-form description section on the storefront, with a matching admin editor.

**Architecture:** Extend the `products` table with four nullable JSON/text columns. Render a new `<ProductStory>` full-width section on the product page that composes five optional sub-components. In the admin, add a new "Story" section to the product form that edits the new fields, with feature-block image uploads going through R2 exactly like existing product images.

**Tech Stack:** Drizzle ORM + D1 (expand-only migration), Next.js 16 App Router, React Server Components, Zod validation, shadcn/ui (Accordion), Hugeicons for highlight icons, Cloudflare R2 via `lib/storage/images.ts`, Vitest 4 for unit tests.

**Spec:** [`docs/superpowers/specs/2026-04-16-product-story-template-design.md`](../specs/2026-04-16-product-story-template-design.md)

**Branch:** `feat/product-story-template` (already created)

---

## File Structure

### New files

```text
drizzle/
└── 0010_product_story.sql                               # schema migration

lib/
├── validations/
│   └── product-story.ts                                 # Zod schemas
└── utils/
    └── product-story.ts                                 # safeParseJson helper

components/
├── ui/
│   └── accordion.tsx                                    # shadcn/ui component
├── storefront/
│   └── product-story/
│       ├── index.tsx                                    # <ProductStory> root
│       ├── story-tagline.tsx
│       ├── story-highlights.tsx
│       ├── story-feature-block.tsx
│       ├── story-faq.tsx
│       ├── story-free-content.tsx
│       └── icons.ts                                     # 50-icon shortlist
└── admin/
    ├── product-story-section.tsx                        # main admin card
    ├── story-icon-picker.tsx                            # popover icon picker
    └── story-feature-block-editor.tsx                   # feature block sub-form

actions/
└── admin/
    └── story.ts                                         # uploadStoryImage

__tests__/unit/
├── product-story-validation.test.ts
├── product-story-parse.test.ts
└── product-story-icons.test.ts
```

### Modified files

```text
lib/db/schema.ts                                         # add 4 columns
lib/db/types.ts                                          # add types + extend Product
lib/db/products.ts                                       # deserialize JSON in getProductBySlug
lib/db/admin/products.ts                                 # deserialize JSON in getAdminProductById
app/(storefront)/p/[slug]/page.tsx                       # restructure layout
components/storefront/product-details.tsx                # split into ProductSpecs
actions/admin/products.ts                                # extend productSchema + updateProduct
components/admin/product-form-sections.tsx               # add Story section entry
```

---

## Task 1 — Add shadcn Accordion component

Needed for the FAQ block.

**Files:**
- Create: `components/ui/accordion.tsx`
- Modify: `package.json` (dependency `@radix-ui/react-accordion` if missing)

- [ ] **Step 1.1: Check for existing accordion and install via shadcn CLI**

```bash
ls components/ui/accordion.tsx 2>/dev/null && echo "already present" || npx shadcn@latest add accordion --yes
```

Expected: either "already present" OR the CLI adds `components/ui/accordion.tsx` and installs `@radix-ui/react-accordion`.

- [ ] **Step 1.2: Verify build passes**

```bash
npx tsc --noEmit
```

Expected: no new errors (there may be pre-existing warnings; confirm none mention `accordion`).

- [ ] **Step 1.3: Commit**

```bash
git add components/ui/accordion.tsx package.json package-lock.json
git commit -m "feat(storefront): add shadcn accordion component for product story FAQ"
```

---

## Task 2 — Add Drizzle schema columns for the 4 new fields

**Files:**
- Modify: `lib/db/schema.ts:139-166` (products table)
- Create: `drizzle/0010_product_story.sql` (generated)
- Modify: `drizzle/meta/_journal.json` (auto-updated by drizzle-kit)

- [ ] **Step 2.1: Edit `lib/db/schema.ts` — add 4 nullable text columns to `products`**

Insert these four lines immediately **after** `meta_description: text("meta_description"),` (around line 158) and **before** `created_at:` (around line 159):

```ts
  tagline: text("tagline"),
  highlights: text("highlights"),
  feature_blocks: text("feature_blocks"),
  faq: text("faq"),
```

Only the 4 added lines are new; the rest of the `products` table definition must remain untouched.

- [ ] **Step 2.2: Generate the migration**

```bash
npm run db:generate
```

Expected: drizzle-kit prints something like *"✓ Your SQL migration file ➜ drizzle/0010_<name>.sql 🚀"* and updates `drizzle/meta/*.json`.

Open the generated file and **verify** it contains exactly these statements (names and column order must match):

```sql
ALTER TABLE `products` ADD `tagline` text;--> statement-breakpoint
ALTER TABLE `products` ADD `highlights` text;--> statement-breakpoint
ALTER TABLE `products` ADD `feature_blocks` text;--> statement-breakpoint
ALTER TABLE `products` ADD `faq` text;
```

If drizzle-kit assigned a different filename than `0010_product_story.sql`, that's fine — keep whatever name it generates. No need to rename.

- [ ] **Step 2.3: Verify migration safety gate passes**

```bash
node scripts/check-migration-safety.mjs
```

Expected output includes *"OK"* or equivalent success for this migration. `ALTER TABLE ... ADD COLUMN` without NOT NULL is always safe → the gate should be silent about it.

- [ ] **Step 2.4: Apply the migration locally**

```bash
npm run db:migrate
```

Expected: migrations apply without errors. Double-check with:

```bash
npx wrangler d1 execute netereka-db --local --command "SELECT sql FROM sqlite_master WHERE name='products'" | grep -E "(tagline|highlights|feature_blocks|faq)"
```

Expected: all four column names appear in the CREATE TABLE output.

- [ ] **Step 2.5: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat(db): add tagline/highlights/feature_blocks/faq columns to products"
```

---

## Task 3 — TypeScript types for the story fields

**Files:**
- Modify: `lib/db/types.ts:13-40` (Product interface)

- [ ] **Step 3.1: Add new interfaces in `lib/db/types.ts` immediately before `export interface Product {`**

Insert the following interfaces just before line 13 (`export interface Product {`). They describe the **parsed** runtime shape (arrays of objects), not the raw JSON string stored in D1.

```ts
export interface ProductHighlight {
  icon: string;
  label: string;
}

export interface ProductFeatureBlock {
  title: string;
  body: string;
  image_url?: string | null;
  image_alt?: string | null;
}

export interface ProductFaqItem {
  question: string;
  answer: string;
}
```

- [ ] **Step 3.2: Extend the `Product` interface with the 4 new fields**

In the `Product` interface (starting line 13), add these four properties immediately after `meta_description: string | null;`:

```ts
  tagline: string | null;
  highlights: ProductHighlight[] | null;
  feature_blocks: ProductFeatureBlock[] | null;
  faq: ProductFaqItem[] | null;
```

- [ ] **Step 3.3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: errors surface on every query site that selects `products.*` but deserializes into `Product` (because the raw row has `string | null` for JSON fields, not arrays). We'll fix these in Task 5. Make note of the error count — it should be small (< 10 sites).

If the count exceeds 10 errors, stop and investigate: there may be unexpected consumers.

- [ ] **Step 3.4: Commit (even though tsc errors exist — they'll be fixed in Task 5)**

Skip the commit for now; Task 5 fixes these errors and we commit both together.

---

## Task 4 — Zod validation schemas + shortlist registration

**Files:**
- Create: `lib/validations/product-story.ts`
- Create: `__tests__/unit/product-story-validation.test.ts`

- [ ] **Step 4.1: Write failing tests first**

Create `__tests__/unit/product-story-validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  taglineSchema,
  highlightsSchema,
  featureBlocksSchema,
  faqSchema,
  HIGHLIGHT_ICON_NAMES,
} from "@/lib/validations/product-story";

describe("taglineSchema", () => {
  it("accepts null", () => {
    expect(taglineSchema.parse(null)).toBeNull();
  });
  it("accepts an empty string as null", () => {
    expect(taglineSchema.parse("")).toBeNull();
  });
  it("accepts a short string", () => {
    expect(taglineSchema.parse("Un iPhone qui dure.")).toBe("Un iPhone qui dure.");
  });
  it("rejects > 200 chars", () => {
    expect(() => taglineSchema.parse("x".repeat(201))).toThrow();
  });
});

describe("highlightsSchema", () => {
  const validIcon = HIGHLIGHT_ICON_NAMES[0];
  it("accepts null (block disabled)", () => {
    expect(highlightsSchema.parse(null)).toBeNull();
  });
  it("rejects 1 or 2 items", () => {
    expect(() =>
      highlightsSchema.parse([{ icon: validIcon, label: "a" }]),
    ).toThrow();
  });
  it("accepts 3 items", () => {
    const items = Array.from({ length: 3 }, () => ({ icon: validIcon, label: "ok" }));
    expect(highlightsSchema.parse(items)).toHaveLength(3);
  });
  it("accepts 6 items", () => {
    const items = Array.from({ length: 6 }, () => ({ icon: validIcon, label: "ok" }));
    expect(highlightsSchema.parse(items)).toHaveLength(6);
  });
  it("rejects 7 items", () => {
    const items = Array.from({ length: 7 }, () => ({ icon: validIcon, label: "ok" }));
    expect(() => highlightsSchema.parse(items)).toThrow();
  });
  it("rejects an unknown icon", () => {
    expect(() =>
      highlightsSchema.parse([{ icon: "not-a-real-icon", label: "ok" }, { icon: validIcon, label: "ok" }, { icon: validIcon, label: "ok" }]),
    ).toThrow();
  });
  it("rejects a label > 80 chars", () => {
    expect(() =>
      highlightsSchema.parse([
        { icon: validIcon, label: "x".repeat(81) },
        { icon: validIcon, label: "ok" },
        { icon: validIcon, label: "ok" },
      ]),
    ).toThrow();
  });
});

describe("featureBlocksSchema", () => {
  const ok = { title: "T", body: "B" };
  it("accepts null", () => {
    expect(featureBlocksSchema.parse(null)).toBeNull();
  });
  it("rejects 1 item", () => {
    expect(() => featureBlocksSchema.parse([ok])).toThrow();
  });
  it("accepts 2 to 4 items", () => {
    expect(featureBlocksSchema.parse([ok, ok])).toHaveLength(2);
    expect(featureBlocksSchema.parse([ok, ok, ok, ok])).toHaveLength(4);
  });
  it("rejects 5 items", () => {
    expect(() => featureBlocksSchema.parse([ok, ok, ok, ok, ok])).toThrow();
  });
  it("rejects body > 600 chars", () => {
    expect(() =>
      featureBlocksSchema.parse([
        { title: "T", body: "x".repeat(601) },
        { title: "T", body: "B" },
      ]),
    ).toThrow();
  });
  it("accepts image_url and image_alt as optional", () => {
    const parsed = featureBlocksSchema.parse([
      { title: "T", body: "B", image_url: "products/abc/hero.jpg", image_alt: "alt" },
      { title: "T", body: "B" },
    ]);
    expect(parsed?.[0].image_url).toBe("products/abc/hero.jpg");
    expect(parsed?.[1].image_url).toBeUndefined();
  });
});

describe("faqSchema", () => {
  it("accepts null", () => {
    expect(faqSchema.parse(null)).toBeNull();
  });
  it("accepts an empty array (block disabled)", () => {
    expect(faqSchema.parse([])).toEqual([]);
  });
  it("accepts 5 items", () => {
    const items = Array.from({ length: 5 }, () => ({ question: "q", answer: "a" }));
    expect(faqSchema.parse(items)).toHaveLength(5);
  });
  it("rejects 6 items", () => {
    const items = Array.from({ length: 6 }, () => ({ question: "q", answer: "a" }));
    expect(() => faqSchema.parse(items)).toThrow();
  });
});
```

- [ ] **Step 4.2: Run tests — expect failure**

```bash
npx vitest run __tests__/unit/product-story-validation.test.ts
```

Expected: module-not-found error — validation file doesn't exist yet.

- [ ] **Step 4.3: Create `lib/validations/product-story.ts`**

```ts
import { z } from "zod";

/**
 * Curated shortlist of Hugeicons names used in product highlights.
 * Storefront icons module (`components/storefront/product-story/icons.ts`) must
 * expose a component for every name in this list. Removing a name here must
 * be coordinated with a DB cleanup of any product still referencing it.
 */
export const HIGHLIGHT_ICON_NAMES = [
  "battery",
  "battery-charging",
  "bluetooth",
  "bolt",
  "camera",
  "charge-fast",
  "cloud",
  "compass",
  "cpu",
  "dashboard",
  "display",
  "eye",
  "fingerprint",
  "flash",
  "gaming-pad",
  "gift",
  "globe",
  "gps",
  "headphones",
  "heart",
  "hourglass",
  "key",
  "leaf",
  "lock",
  "medal",
  "microphone",
  "moon",
  "music-note",
  "notification",
  "package",
  "palette",
  "printer",
  "ruler",
  "sd-card",
  "shield",
  "shield-check",
  "shopping-bag",
  "smart-phone",
  "sparkle",
  "speaker",
  "star",
  "sun",
  "tools",
  "truck",
  "tv",
  "usb",
  "video",
  "volume",
  "water-resistant",
  "wifi",
  "zap",
] as const;

export type HighlightIconName = (typeof HIGHLIGHT_ICON_NAMES)[number];

const iconSchema = z.enum(HIGHLIGHT_ICON_NAMES);

/** tagline → trimmed, empty → null, max 200 chars */
export const taglineSchema = z
  .union([z.string(), z.null()])
  .transform((v) => (v == null ? null : v.trim()))
  .transform((v) => (v === "" ? null : v))
  .pipe(z.string().max(200, "La tagline doit faire moins de 200 caractères").nullable());

export const highlightSchema = z.object({
  icon: iconSchema,
  label: z.string().min(1, "Libellé requis").max(80, "Max 80 caractères"),
});

/** highlights → null (disabled) OR 3–6 items */
export const highlightsSchema = z
  .array(highlightSchema)
  .min(3, "Au moins 3 points forts")
  .max(6, "Au plus 6 points forts")
  .nullable();

export const featureBlockSchema = z.object({
  title: z.string().min(1, "Titre requis").max(120, "Max 120 caractères"),
  body: z.string().min(1, "Texte requis").max(600, "Max 600 caractères"),
  image_url: z.string().min(1).max(500).optional(),
  image_alt: z.string().max(200).optional(),
});

/** feature_blocks → null (disabled) OR 2–4 items */
export const featureBlocksSchema = z
  .array(featureBlockSchema)
  .min(2, "Au moins 2 blocs")
  .max(4, "Au plus 4 blocs")
  .nullable();

export const faqItemSchema = z.object({
  question: z.string().min(1, "Question requise").max(160, "Max 160 caractères"),
  answer: z.string().min(1, "Réponse requise").max(600, "Max 600 caractères"),
});

/** faq → null OR 0–5 items (empty array treated as "no faq") */
export const faqSchema = z
  .array(faqItemSchema)
  .max(5, "Au plus 5 questions")
  .nullable();

/** Aggregate shape sent from the admin form */
export const productStorySchema = z.object({
  tagline: taglineSchema,
  highlights: highlightsSchema,
  feature_blocks: featureBlocksSchema,
  faq: faqSchema,
});

export type ProductStoryInput = z.infer<typeof productStorySchema>;
```

- [ ] **Step 4.4: Run tests — expect pass**

```bash
npx vitest run __tests__/unit/product-story-validation.test.ts
```

Expected: all ~20 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add lib/validations/product-story.ts __tests__/unit/product-story-validation.test.ts
git commit -m "feat(storefront): add zod validation for product story fields"
```

---

## Task 5 — Safe JSON parse helper + deserialization in query helpers

**Files:**
- Create: `lib/utils/product-story.ts`
- Modify: `lib/db/products.ts:32-58` (getProductBySlug)
- Modify: `lib/db/admin/products.ts:101-129` (getAdminProductById)
- Create: `__tests__/unit/product-story-parse.test.ts`

- [ ] **Step 5.1: Write failing tests for the parser**

Create `__tests__/unit/product-story-parse.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseHighlights,
  parseFeatureBlocks,
  parseFaq,
  hydrateProductStoryFields,
} from "@/lib/utils/product-story";

describe("parseHighlights", () => {
  it("returns null for null / empty / invalid JSON", () => {
    expect(parseHighlights(null)).toBeNull();
    expect(parseHighlights("")).toBeNull();
    expect(parseHighlights("nope")).toBeNull();
  });

  it("returns null for JSON that does not match the shape", () => {
    expect(parseHighlights(JSON.stringify({ foo: "bar" }))).toBeNull();
    expect(parseHighlights(JSON.stringify([{ icon: "x" }]))).toBeNull();
  });

  it("returns parsed array for valid JSON", () => {
    const raw = JSON.stringify([
      { icon: "battery", label: "6000 mAh" },
      { icon: "camera", label: "108 MP" },
    ]);
    expect(parseHighlights(raw)).toEqual([
      { icon: "battery", label: "6000 mAh" },
      { icon: "camera", label: "108 MP" },
    ]);
  });
});

describe("parseFeatureBlocks", () => {
  it("returns null for invalid JSON", () => {
    expect(parseFeatureBlocks("{{")).toBeNull();
  });
  it("accepts blocks with optional image fields", () => {
    const raw = JSON.stringify([
      { title: "A", body: "B" },
      { title: "C", body: "D", image_url: "x.jpg", image_alt: "alt" },
    ]);
    expect(parseFeatureBlocks(raw)).toEqual([
      { title: "A", body: "B" },
      { title: "C", body: "D", image_url: "x.jpg", image_alt: "alt" },
    ]);
  });
});

describe("parseFaq", () => {
  it("returns null for invalid JSON", () => {
    expect(parseFaq("nope")).toBeNull();
  });
  it("accepts an empty array", () => {
    expect(parseFaq("[]")).toEqual([]);
  });
});

describe("hydrateProductStoryFields", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errSpy.mockRestore();
  });

  it("replaces raw JSON strings with parsed arrays/objects, preserving null", () => {
    const row = {
      id: "p1",
      tagline: "Hello",
      highlights: JSON.stringify([
        { icon: "battery", label: "L" },
        { icon: "battery", label: "L" },
        { icon: "battery", label: "L" },
      ]),
      feature_blocks: null,
      faq: JSON.stringify([]),
    };

    const hydrated = hydrateProductStoryFields(row);

    expect(hydrated.tagline).toBe("Hello");
    expect(hydrated.highlights).toHaveLength(3);
    expect(hydrated.feature_blocks).toBeNull();
    expect(hydrated.faq).toEqual([]);
  });

  it("logs and falls back to null when JSON is malformed", () => {
    const row = {
      id: "p1",
      tagline: null,
      highlights: "definitely not json",
      feature_blocks: null,
      faq: null,
    };

    const hydrated = hydrateProductStoryFields(row);
    expect(hydrated.highlights).toBeNull();
    expect(errSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5.2: Run tests — expect failure**

```bash
npx vitest run __tests__/unit/product-story-parse.test.ts
```

Expected: module-not-found.

- [ ] **Step 5.3: Create `lib/utils/product-story.ts`**

```ts
import {
  highlightsSchema,
  featureBlocksSchema,
  faqSchema,
} from "@/lib/validations/product-story";
import type {
  ProductHighlight,
  ProductFeatureBlock,
  ProductFaqItem,
} from "@/lib/db/types";

/**
 * Row shape as returned by raw D1 queries: JSON columns are strings.
 * After hydration, they become typed arrays (or null on absence / malformed JSON).
 */
export interface StoryRawFields {
  tagline: string | null;
  highlights: string | null;
  feature_blocks: string | null;
  faq: string | null;
}

export interface StoryHydratedFields {
  tagline: string | null;
  highlights: ProductHighlight[] | null;
  feature_blocks: ProductFeatureBlock[] | null;
  faq: ProductFaqItem[] | null;
}

function parseWith<T>(
  raw: string | null,
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T } },
  label: string,
): T | null {
  if (raw == null || raw === "") return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`[product-story] malformed JSON in column ${label} — falling back to null`, err);
    return null;
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    console.error(`[product-story] JSON failed ${label} schema validation — falling back to null`, {
      raw: raw.slice(0, 120),
    });
    return null;
  }
  return result.data ?? null;
}

export function parseHighlights(raw: string | null): ProductHighlight[] | null {
  return parseWith(raw, highlightsSchema, "highlights");
}

export function parseFeatureBlocks(raw: string | null): ProductFeatureBlock[] | null {
  return parseWith(raw, featureBlocksSchema, "feature_blocks");
}

export function parseFaq(raw: string | null): ProductFaqItem[] | null {
  return parseWith(raw, faqSchema, "faq");
}

/**
 * Takes a DB row that still has JSON strings in the story columns and returns
 * the same object with those columns hydrated to typed arrays (or null).
 * Used by `getProductBySlug` and `getAdminProductById`.
 */
export function hydrateProductStoryFields<T extends StoryRawFields>(
  row: T,
): Omit<T, keyof StoryRawFields> & StoryHydratedFields {
  return {
    ...row,
    tagline: row.tagline ?? null,
    highlights: parseHighlights(row.highlights),
    feature_blocks: parseFeatureBlocks(row.feature_blocks),
    faq: parseFaq(row.faq),
  };
}
```

- [ ] **Step 5.4: Wire the helper into `lib/db/products.ts`**

In `lib/db/products.ts`, modify `getProductBySlug` (around line 32). The current return is `{ ...product, images, variants, attributes }`. Replace with hydration:

At the top of the file, add the import:

```ts
import { hydrateProductStoryFields } from "@/lib/utils/product-story";
```

Then change the final `return` in `getProductBySlug` from:

```ts
  return { ...product, images, variants, attributes };
```

to:

```ts
  return { ...hydrateProductStoryFields(product), images, variants, attributes };
```

Also update the raw row type parameter to reflect the raw JSON columns. The current `queryFirst<Product>(...)` assumes arrays; update it to a raw shape. Replace the `queryFirst<Product>` line near line 33 with:

```ts
  const product = await queryFirst<Omit<Product, "highlights" | "feature_blocks" | "faq"> & {
    highlights: string | null;
    feature_blocks: string | null;
    faq: string | null;
  }>(
```

- [ ] **Step 5.5: Same change in `lib/db/admin/products.ts` (`getAdminProductById`, line 101)**

Add the same import at top, change the return to spread through `hydrateProductStoryFields`, and update the `queryFirst<Product>` type parameter identically.

- [ ] **Step 5.6: Run tests — expect pass**

```bash
npx vitest run __tests__/unit/product-story-parse.test.ts
npx tsc --noEmit
```

Expected: all parse tests pass, `tsc` reports no errors related to products/types (the Task-3 transient errors are now fixed).

- [ ] **Step 5.7: Commit**

```bash
git add lib/utils/product-story.ts lib/db/types.ts lib/db/products.ts lib/db/admin/products.ts __tests__/unit/product-story-parse.test.ts
git commit -m "feat(db): hydrate product story JSON columns in query helpers"
```

---

## Task 6 — Storefront icon shortlist module

**Files:**
- Create: `components/storefront/product-story/icons.ts`
- Create: `__tests__/unit/product-story-icons.test.ts`

- [ ] **Step 6.1: Write a failing test**

Create `__tests__/unit/product-story-icons.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveHighlightIcon, HIGHLIGHT_ICON_MAP } from "@/components/storefront/product-story/icons";
import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";

describe("HIGHLIGHT_ICON_MAP", () => {
  it("exposes every name in the validation shortlist", () => {
    for (const name of HIGHLIGHT_ICON_NAMES) {
      expect(HIGHLIGHT_ICON_MAP[name]).toBeDefined();
    }
  });
});

describe("resolveHighlightIcon", () => {
  it("returns the mapped icon for a valid name", () => {
    const icon = resolveHighlightIcon("battery");
    expect(icon).toBeDefined();
  });
  it("returns the fallback icon for an unknown name", () => {
    const fallback = resolveHighlightIcon("unknown-name-xyz");
    expect(fallback).toBeDefined();
    // should equal the star fallback
    expect(fallback).toBe(HIGHLIGHT_ICON_MAP["star"]);
  });
});
```

- [ ] **Step 6.2: Run test — expect failure**

```bash
npx vitest run __tests__/unit/product-story-icons.test.ts
```

Expected: module-not-found.

- [ ] **Step 6.3: Create `components/storefront/product-story/icons.ts`**

Map every name in `HIGHLIGHT_ICON_NAMES` to a Hugeicons free icon component. Use the names already available in `@hugeicons/core-free-icons` — when a 1:1 match is unclear, pick the closest-matching free icon.

```ts
import type { IconSvgElement } from "@hugeicons/react";
import {
  // battery
  BatteryFullIcon,
  BatteryChargingIcon,
  // connectivity
  BluetoothIcon,
  WifiConnectedIcon,
  UsbIcon,
  // bolt / zap / flash / charge-fast
  ThunderboltIcon,
  Flash01Icon,
  CloudIcon,
  // camera / video / display / tv
  Camera01Icon,
  VideoReplayIcon,
  ComputerIcon,
  Tv01Icon,
  // control & input
  DashboardSquare01Icon,
  FingerPrintIcon,
  EyeIcon,
  Key01Icon,
  LockIcon,
  ShieldIcon,
  Shield01Icon as ShieldCheckIcon,
  // misc
  Cpu01Icon as CpuIcon,
  GameController01Icon,
  Gift01Icon,
  GlobalIcon,
  CompassIcon,
  GpsSignalIcon,
  HeadphonesIcon,
  Heart01Icon,
  HourglassIcon,
  Leaf01Icon,
  MedalFirstPlaceIcon,
  Mic01Icon,
  Moon02Icon,
  MusicNote01Icon,
  NotificationCircleIcon,
  PackageIcon,
  PaintBoardIcon as PaletteIcon,
  Printer01Icon,
  Ruler01Icon as RulerIcon,
  SdCardIcon,
  ShoppingBag01Icon,
  SmartPhone01Icon,
  Sparkles01Icon as SparkleIcon,
  SpeakerIcon,
  Star01Icon,
  Sun03Icon,
  Tools01Icon as ToolsIcon,
  TruckDeliveryIcon,
  VolumeHighIcon,
  Droplet01Icon as WaterResistantIcon,
} from "@hugeicons/core-free-icons";
import type { HighlightIconName } from "@/lib/validations/product-story";

/**
 * Map every name in `HIGHLIGHT_ICON_NAMES` (validation) to a Hugeicons component.
 * Must stay in sync with that list. The build/test fails if a name is missing.
 */
export const HIGHLIGHT_ICON_MAP: Record<HighlightIconName, IconSvgElement> = {
  "battery": BatteryFullIcon,
  "battery-charging": BatteryChargingIcon,
  "bluetooth": BluetoothIcon,
  "bolt": ThunderboltIcon,
  "camera": Camera01Icon,
  "charge-fast": ThunderboltIcon,
  "cloud": CloudIcon,
  "compass": CompassIcon,
  "cpu": CpuIcon,
  "dashboard": DashboardSquare01Icon,
  "display": ComputerIcon,
  "eye": EyeIcon,
  "fingerprint": FingerPrintIcon,
  "flash": Flash01Icon,
  "gaming-pad": GameController01Icon,
  "gift": Gift01Icon,
  "globe": GlobalIcon,
  "gps": GpsSignalIcon,
  "headphones": HeadphonesIcon,
  "heart": Heart01Icon,
  "hourglass": HourglassIcon,
  "key": Key01Icon,
  "leaf": Leaf01Icon,
  "lock": LockIcon,
  "medal": MedalFirstPlaceIcon,
  "microphone": Mic01Icon,
  "moon": Moon02Icon,
  "music-note": MusicNote01Icon,
  "notification": NotificationCircleIcon,
  "package": PackageIcon,
  "palette": PaletteIcon,
  "printer": Printer01Icon,
  "ruler": RulerIcon,
  "sd-card": SdCardIcon,
  "shield": ShieldIcon,
  "shield-check": ShieldCheckIcon,
  "shopping-bag": ShoppingBag01Icon,
  "smart-phone": SmartPhone01Icon,
  "sparkle": SparkleIcon,
  "speaker": SpeakerIcon,
  "star": Star01Icon,
  "sun": Sun03Icon,
  "tools": ToolsIcon,
  "truck": TruckDeliveryIcon,
  "tv": Tv01Icon,
  "usb": UsbIcon,
  "video": VideoReplayIcon,
  "volume": VolumeHighIcon,
  "water-resistant": WaterResistantIcon,
  "wifi": WifiConnectedIcon,
  "zap": ThunderboltIcon,
};

export function resolveHighlightIcon(name: string): IconSvgElement {
  if (name in HIGHLIGHT_ICON_MAP) {
    return HIGHLIGHT_ICON_MAP[name as HighlightIconName];
  }
  console.warn(`[product-story] unknown highlight icon "${name}" — falling back to "star"`);
  return HIGHLIGHT_ICON_MAP["star"];
}
```

**Note on import names:** the exact free-icon names above are educated guesses from the Hugeicons free-icons package. If `tsc` reports a missing export for any import, check the actual export names in `node_modules/@hugeicons/core-free-icons/dist/index.d.ts` and substitute the closest match. Keep the **key names** (the left side of each entry) identical to `HIGHLIGHT_ICON_NAMES` — only the imported component may change.

- [ ] **Step 6.4: Run tests + tsc**

```bash
npx tsc --noEmit
npx vitest run __tests__/unit/product-story-icons.test.ts
```

Expected: both pass. If `tsc` fails on missing Hugeicons exports, fix imports (see note above) and re-run.

- [ ] **Step 6.5: Commit**

```bash
git add components/storefront/product-story/icons.ts __tests__/unit/product-story-icons.test.ts
git commit -m "feat(storefront): add highlight icon shortlist for product story"
```

---

## Task 7 — Storefront: StoryTagline component

**Files:**
- Create: `components/storefront/product-story/story-tagline.tsx`

- [ ] **Step 7.1: Create the component**

```tsx
interface StoryTaglineProps {
  tagline: string;
}

export function StoryTagline({ tagline }: StoryTaglineProps) {
  return (
    <div className="mx-auto max-w-[800px] px-6 text-center">
      <p className="text-4xl font-light leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
        {tagline}
      </p>
    </div>
  );
}
```

- [ ] **Step 7.2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7.3: Commit**

```bash
git add components/storefront/product-story/story-tagline.tsx
git commit -m "feat(storefront): add StoryTagline component"
```

---

## Task 8 — Storefront: StoryHighlights component

**Files:**
- Create: `components/storefront/product-story/story-highlights.tsx`

- [ ] **Step 8.1: Create the component**

```tsx
import { HugeiconsIcon } from "@hugeicons/react";
import type { ProductHighlight } from "@/lib/db/types";
import { resolveHighlightIcon } from "./icons";

interface StoryHighlightsProps {
  highlights: ProductHighlight[];
}

export function StoryHighlights({ highlights }: StoryHighlightsProps) {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3">
        {highlights.map((item, idx) => (
          <div
            key={`${item.icon}-${idx}`}
            className="flex flex-col items-center text-center"
          >
            <HugeiconsIcon
              icon={resolveHighlightIcon(item.icon)}
              size={40}
              strokeWidth={1.5}
              className="text-foreground"
            />
            <p className="mt-4 text-base font-medium leading-snug">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2: Verify tsc + commit**

```bash
npx tsc --noEmit
git add components/storefront/product-story/story-highlights.tsx
git commit -m "feat(storefront): add StoryHighlights component"
```

---

## Task 9 — Storefront: StoryFeatureBlock component

**Files:**
- Create: `components/storefront/product-story/story-feature-block.tsx`

- [ ] **Step 9.1: Create the component**

```tsx
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ProductFeatureBlock } from "@/lib/db/types";
import { getImageUrl } from "@/lib/utils/images";

interface StoryFeatureBlockProps {
  block: ProductFeatureBlock;
  /** 0-indexed position among feature blocks — determines zig-zag direction */
  index: number;
}

export function StoryFeatureBlock({ block, index }: StoryFeatureBlockProps) {
  const hasImage = !!block.image_url;
  const isOdd = index % 2 === 1;

  return (
    <div className="mx-auto max-w-6xl px-6">
      {hasImage ? (
        <div
          className={cn(
            "grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16",
            // zig-zag on md+: odd indices (2nd, 4th, …) invert image/text order
            isOdd && "md:[&>*:first-child]:order-2",
          )}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
            <Image
              src={getImageUrl(block.image_url!)}
              alt={block.image_alt ?? ""}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {block.title}
            </h3>
            <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
              {block.body}
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <h3 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
            {block.title}
          </h3>
          <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
            {block.body}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9.2: Verify tsc + commit**

```bash
npx tsc --noEmit
git add components/storefront/product-story/story-feature-block.tsx
git commit -m "feat(storefront): add StoryFeatureBlock zig-zag component"
```

---

## Task 10 — Storefront: StoryFaq component

**Files:**
- Create: `components/storefront/product-story/story-faq.tsx`

- [ ] **Step 10.1: Create the component**

```tsx
"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ProductFaqItem } from "@/lib/db/types";

interface StoryFaqProps {
  faq: ProductFaqItem[];
}

export function StoryFaq({ faq }: StoryFaqProps) {
  return (
    <div className="mx-auto max-w-3xl px-6">
      <h2 className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl">
        Questions fréquentes
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {faq.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left text-lg font-medium">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
```

- [ ] **Step 10.2: Verify tsc + commit**

```bash
npx tsc --noEmit
git add components/storefront/product-story/story-faq.tsx
git commit -m "feat(storefront): add StoryFaq accordion component"
```

---

## Task 11 — Storefront: StoryFreeContent component

**Files:**
- Create: `components/storefront/product-story/story-free-content.tsx`

- [ ] **Step 11.1: Create the component**

```tsx
import { descriptionToHtml } from "@/lib/utils/description-to-html";

interface StoryFreeContentProps {
  description: string;
  descriptionType?: string;
  productId?: string;
}

export function StoryFreeContent({
  description,
  descriptionType,
  productId,
}: StoryFreeContentProps) {
  const html = descriptionToHtml(description, descriptionType);
  if (!html) return null;
  const scopeClass =
    descriptionType === "html" && productId ? `desc-${productId}` : undefined;
  return (
    <div className="mx-auto max-w-3xl px-6">
      <div
        className={`prose prose-lg max-w-none dark:prose-invert ${scopeClass ?? ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
```

- [ ] **Step 11.2: Verify tsc + commit**

```bash
npx tsc --noEmit
git add components/storefront/product-story/story-free-content.tsx
git commit -m "feat(storefront): add StoryFreeContent wrapper"
```

---

## Task 12 — Storefront: ProductStory root component

**Files:**
- Create: `components/storefront/product-story/index.tsx`

- [ ] **Step 12.1: Create the orchestrator**

```tsx
import type {
  ProductHighlight,
  ProductFeatureBlock,
  ProductFaqItem,
} from "@/lib/db/types";
import { descriptionToHtml } from "@/lib/utils/description-to-html";
import { StoryTagline } from "./story-tagline";
import { StoryHighlights } from "./story-highlights";
import { StoryFeatureBlock } from "./story-feature-block";
import { StoryFaq } from "./story-faq";
import { StoryFreeContent } from "./story-free-content";

interface ProductStoryProps {
  tagline: string | null;
  highlights: ProductHighlight[] | null;
  featureBlocks: ProductFeatureBlock[] | null;
  faq: ProductFaqItem[] | null;
  description: string | null;
  descriptionType?: string;
  productId?: string;
}

function hasFreeContent(description: string | null, descriptionType?: string): boolean {
  if (!description) return false;
  return !!descriptionToHtml(description, descriptionType);
}

/**
 * Full-width product story. Renders nothing if every block is empty.
 * The root <section> is expected to live OUTSIDE the page's max-w-7xl wrapper.
 */
export function ProductStory({
  tagline,
  highlights,
  featureBlocks,
  faq,
  description,
  descriptionType,
  productId,
}: ProductStoryProps) {
  const hasTagline = !!tagline;
  const hasHighlights = !!highlights && highlights.length > 0;
  const hasFeatureBlocks = !!featureBlocks && featureBlocks.length > 0;
  const hasFaq = !!faq && faq.length > 0;
  const hasFree = hasFreeContent(description, descriptionType);

  if (!hasTagline && !hasHighlights && !hasFeatureBlocks && !hasFaq && !hasFree) {
    return null;
  }

  // Alternate feature-block backgrounds to create rhythm.
  // Intro (tagline + highlights) share the base background;
  // feature blocks alternate; FAQ + free content share base again.
  return (
    <section className="w-full">
      {hasTagline && (
        <div className="py-16 sm:py-24">
          <StoryTagline tagline={tagline!} />
        </div>
      )}
      {hasHighlights && (
        <div className="bg-muted/30 py-16 sm:py-24">
          <StoryHighlights highlights={highlights!} />
        </div>
      )}
      {hasFeatureBlocks &&
        featureBlocks!.map((block, i) => (
          <div
            key={i}
            className={i % 2 === 0 ? "py-16 sm:py-24" : "bg-muted/30 py-16 sm:py-24"}
          >
            <StoryFeatureBlock block={block} index={i} />
          </div>
        ))}
      {hasFaq && (
        <div className="py-16 sm:py-24">
          <StoryFaq faq={faq!} />
        </div>
      )}
      {hasFree && (
        <div className="py-16 sm:py-24">
          <StoryFreeContent
            description={description!}
            descriptionType={descriptionType}
            productId={productId}
          />
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 12.2: Verify tsc + commit**

```bash
npx tsc --noEmit
git add components/storefront/product-story/index.tsx
git commit -m "feat(storefront): add ProductStory orchestrator component"
```

---

## Task 13 — Split ProductDetails into a standalone ProductSpecs component

The current `product-details.tsx` does two jobs (description + attributes). After Task 14 the description is handled by `<ProductStory>`; we just need the attributes table as its own section.

**Files:**
- Modify: `components/storefront/product-details.tsx` (replace with a thin `ProductSpecs`)

- [ ] **Step 13.1: Rewrite `components/storefront/product-details.tsx`**

Replace the entire file with:

```tsx
import type { ProductAttribute } from "@/lib/db/types";

interface ProductSpecsProps {
  attributes: ProductAttribute[];
}

/**
 * Product characteristics section. Renders a 2-column key/value grid.
 * Returns null if there are no displayable attributes (the "Couleur"
 * attribute is filtered out because it's surfaced by the color variant UI).
 */
export function ProductSpecs({ attributes }: ProductSpecsProps) {
  const filtered = attributes.filter((a) => a.name !== "Couleur");
  if (filtered.length === 0) return null;

  return (
    <section className="mt-12 border-t pt-10">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">
        Caractéristiques
      </h2>
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
        {filtered.map((attr) => (
          <div
            key={attr.id}
            className="flex items-baseline gap-4 bg-background px-4 py-3"
          >
            <dt className="shrink-0 text-sm text-muted-foreground">{attr.name}</dt>
            <dd className="ml-auto text-right text-sm font-medium">{attr.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

The old export `ProductDetails` is removed. The product page import will change in Task 14.

- [ ] **Step 13.2: Verify tsc**

```bash
npx tsc --noEmit
```

Expected: one error in `app/(storefront)/p/[slug]/page.tsx` because it still imports `ProductDetails`. We fix that in Task 14.

- [ ] **Step 13.3: Commit**

Skip the commit for now — it ships alongside Task 14.

---

## Task 14 — Integrate ProductStory + ProductSpecs into the product page

**Files:**
- Modify: `app/(storefront)/p/[slug]/page.tsx`

- [ ] **Step 14.1: Edit imports at top of `app/(storefront)/p/[slug]/page.tsx`**

Replace:

```ts
import { ProductDetails } from "@/components/storefront/product-details";
```

with:

```ts
import { ProductSpecs } from "@/components/storefront/product-details";
import { ProductStory } from "@/components/storefront/product-story";
```

- [ ] **Step 14.2: Restructure the return of `ProductPage` to split hero / story / rest**

The current return wraps everything in a single `<div className="mx-auto max-w-7xl px-4 py-6">`. We need the hero (breadcrumb + gallery + price + CTA) inside that wrapper, `<ProductStory>` **outside** the wrapper for full-width, and then the rest (specs + reviews + related) back inside a wrapper.

Replace the return expression with this structure (all other imports/vars/state remain unchanged):

```tsx
  return (
    <>
      <JsonLd data={productSchema} />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Accueil
          </Link>
          <span className="mx-1.5">/</span>
          {product.category_slug ? (
            <>
              <Link
                href={`/c/${product.category_slug}`}
                className="hover:text-foreground"
              >
                {product.category_name}
              </Link>
              <span className="mx-1.5">/</span>
            </>
          ) : null}
          <span className="text-foreground">{product.name}</span>
        </nav>

        {product.variants.length > 0 ? (
          <ProductGalleryWithVariants
            images={product.images}
            variants={product.variants}
            basePrice={product.base_price}
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              imageUrl: product.image_url ?? product.images[0]?.url ?? null,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                {product.brand ? (
                  <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {product.brand}
                  </span>
                ) : null}
                <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
              </div>
              <WishlistButtonDynamic productId={product.id} />
            </div>
          </ProductGalleryWithVariants>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <ImageGallery images={product.images}>
              <Image
                src={getImageUrl(product.images[0]?.url)}
                alt={product.images[0]?.alt || product.name}
                fill
                priority
                fetchPriority="high"
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-6"
              />
            </ImageGallery>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {product.brand ? (
                    <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      {product.brand}
                    </span>
                  ) : null}
                  <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
                </div>
                <WishlistButtonDynamic productId={product.id} />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-bold">
                      {formatPrice(product.base_price)}
                    </p>
                    {hasDiscount && (
                      <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-white">
                        -{discountPercent}%
                      </span>
                    )}
                  </div>
                  {hasDiscount && (
                    <p className="text-sm text-muted-foreground line-through">
                      {formatPrice(comparePrice)}
                    </p>
                  )}
                </div>
                {isOutOfStock && (
                  <p className="text-sm font-medium text-destructive">Rupture de stock</p>
                )}
                <AddToCartButton
                  disabled={isOutOfStock}
                  item={{
                    productId: product.id,
                    variantId: null,
                    name: product.name,
                    variantName: null,
                    price: product.base_price,
                    imageUrl: product.image_url ?? product.images[0]?.url ?? null,
                    slug: product.slug,
                  }}
                />
                <WhatsAppProductButton
                  productName={product.name}
                  price={product.base_price}
                  slug={product.slug}
                  variant="full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full-width Product Story (outside max-w-7xl) */}
      <ProductStory
        tagline={product.tagline}
        highlights={product.highlights}
        featureBlocks={product.feature_blocks}
        faq={product.faq}
        description={product.description}
        descriptionType={product.description_type}
        productId={product.id}
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <ProductSpecs attributes={product.attributes} />

        <Suspense fallback={null}>
          <ProductReviews productId={product.id} />
        </Suspense>

        <Suspense fallback={<RelatedProductsSkeleton />}>
          <RelatedProducts
            productId={product.id}
            categoryId={product.category_id ?? ""}
            categorySlug={product.category_slug}
          />
        </Suspense>
      </div>
    </>
  );
```

- [ ] **Step 14.3: Verify build + visual check**

```bash
npx tsc --noEmit
npm run test -- --run __tests__/unit/product-story
```

Expected: tsc clean, tests pass.

- [ ] **Step 14.4: Start the dev server and visually verify a legacy product still renders**

```bash
npm run dev
```

Open http://localhost:3000 and pick any existing product (one that has a legacy Lexical description). Verify:
- The hero (gallery + price + CTAs) looks the same as before.
- The old description now appears **in the new full-width free-content block** with the larger `prose-lg` size.
- The Caractéristiques section renders below.
- No layout break on mobile.

Stop the dev server with Ctrl+C.

- [ ] **Step 14.5: Commit Tasks 13 + 14 together**

```bash
git add components/storefront/product-details.tsx app/\(storefront\)/p/\[slug\]/page.tsx
git commit -m "feat(storefront): render product story as full-width section on product page"
```

---

## Task 15 — Admin: uploadStoryImage action

**Files:**
- Create: `actions/admin/story.ts`

- [ ] **Step 15.1: Create the server action**

```ts
"use server";

import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { queryFirst } from "@/lib/db";
import { uploadToR2 } from "@/lib/storage/images";
import type { ActionResult } from "@/lib/utils";

const idSchema = z.string().min(1, "ID requis");

/**
 * Upload a feature-block image to R2 under `products/{productId}/story/`.
 * Returns { success: true, url } where `url` is the R2 key (same convention as
 * product_images.url). The admin form stores this key in the feature_blocks JSON.
 *
 * Deletion is NOT handled here — orphaned story images are cleaned up by the
 * Story section editor when the admin removes a feature block (best-effort;
 * left in R2 if the admin navigates away without saving).
 */
export async function uploadStoryImage(
  productId: string,
  formData: FormData,
): Promise<ActionResult & { url?: string }> {
  await requireAdmin();

  const idResult = idSchema.safeParse(productId);
  if (!idResult.success) return { success: false, error: "ID produit invalide" };

  const product = await queryFirst<{ id: string }>(
    "SELECT id FROM products WHERE id = ?",
    [productId],
  );
  if (!product) return { success: false, error: "Produit introuvable" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Aucun fichier sélectionné" };
  }
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Le fichier doit être une image" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "L'image ne doit pas dépasser 5 Mo" };
  }

  const id = nanoid();
  const ext = file.name.split(".").pop() || "jpg";
  const key = `products/${productId}/story/${id}.${ext}`;

  try {
    await uploadToR2(file, key);
  } catch (err) {
    console.error("[admin/story] uploadStoryImage failed", err);
    return { success: false, error: "Erreur lors de l'upload de l'image" };
  }

  return { success: true, url: key };
}
```

- [ ] **Step 15.2: Verify tsc + commit**

```bash
npx tsc --noEmit
git add actions/admin/story.ts
git commit -m "feat(admin): add uploadStoryImage action for feature block images"
```

---

## Task 16 — Admin: extend productSchema and updateProduct with story fields

**Files:**
- Modify: `actions/admin/products.ts` (productSchema around lines 18-33, updateProduct around lines 100-241)

- [ ] **Step 16.1: Import story validations at the top of `actions/admin/products.ts`**

Add after the existing imports:

```ts
import {
  taglineSchema,
  highlightsSchema,
  featureBlocksSchema,
  faqSchema,
} from "@/lib/validations/product-story";
```

- [ ] **Step 16.2: Extend `productSchema` (around line 18)**

Add the four new fields to the `productSchema` object. Because form data carries them as JSON strings, we preprocess:

Replace the end of `productSchema` (just before the closing `})`) with:

```ts
  is_active: z.coerce.number().int().min(0).max(1).default(1),
  is_featured: z.coerce.number().int().min(0).max(1).default(0),
  tagline: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    taglineSchema,
  ),
  highlights: z.preprocess((v) => {
    if (typeof v !== "string" || v.trim() === "") return null;
    try { return JSON.parse(v); } catch { return "__invalid__"; }
  }, highlightsSchema),
  feature_blocks: z.preprocess((v) => {
    if (typeof v !== "string" || v.trim() === "") return null;
    try { return JSON.parse(v); } catch { return "__invalid__"; }
  }, featureBlocksSchema),
  faq: z.preprocess((v) => {
    if (typeof v !== "string" || v.trim() === "") return null;
    try { return JSON.parse(v); } catch { return "__invalid__"; }
  }, faqSchema),
});
```

(The `"__invalid__"` sentinel forces a Zod failure on malformed JSON so the admin sees a validation error rather than a silent null.)

- [ ] **Step 16.3: Extend the `updateProduct` SQL UPDATE statement**

Locate the `updateSql` template literal inside `updateProduct` (around line 163). Replace it with:

```ts
  const updateSql = `UPDATE products SET
     category_id = ?, name = ?, slug = ?, description = ?, description_type = ?, short_description = ?,
     base_price = ?, compare_price = ?, sku = ?, brand = ?,
     is_active = ?, is_featured = ?, stock_quantity = ?,
     low_stock_threshold = ?, weight_grams = ?, meta_title = ?, meta_description = ?,
     tagline = ?, highlights = ?, feature_blocks = ?, faq = ?,
     is_draft = 0,
     updated_at = datetime('now')
   WHERE id = ?`;
```

- [ ] **Step 16.4: Update `buildParams` to include the 4 new fields**

Just before the `id,` line at the end of `buildParams`, insert the 4 new bind values (right after `data.meta_description || null,`):

```ts
    data.tagline ?? null,
    data.highlights == null ? null : JSON.stringify(data.highlights),
    data.feature_blocks == null ? null : JSON.stringify(data.feature_blocks),
    data.faq == null ? null : JSON.stringify(data.faq),
    id,
```

- [ ] **Step 16.5: Verify tsc**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 16.6: Commit**

```bash
git add actions/admin/products.ts
git commit -m "feat(admin): extend updateProduct to persist product story fields"
```

---

## Task 17 — Admin: StoryIconPicker component

**Files:**
- Create: `components/admin/story-icon-picker.tsx`

- [ ] **Step 17.1: Create the picker**

```tsx
"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";
import { HIGHLIGHT_ICON_MAP } from "@/components/storefront/product-story/icons";

interface StoryIconPickerProps {
  value: string;
  onChange: (name: string) => void;
  className?: string;
}

export function StoryIconPicker({ value, onChange, className }: StoryIconPickerProps) {
  const [open, setOpen] = useState(false);
  const icon = HIGHLIGHT_ICON_MAP[value as keyof typeof HIGHLIGHT_ICON_MAP]
    ?? HIGHLIGHT_ICON_MAP["star"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("h-10 w-10 shrink-0", className)}
          aria-label="Choisir une icône"
        >
          <HugeiconsIcon icon={icon} size={20} strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="grid grid-cols-6 gap-1">
          {HIGHLIGHT_ICON_NAMES.map((name) => {
            const isSelected = name === value;
            return (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={name}
                aria-pressed={isSelected}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground",
                  isSelected && "bg-accent text-foreground ring-2 ring-primary",
                )}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
              >
                <HugeiconsIcon
                  icon={HIGHLIGHT_ICON_MAP[name]}
                  size={20}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 17.2: Verify tsc + commit**

```bash
npx tsc --noEmit
git add components/admin/story-icon-picker.tsx
git commit -m "feat(admin): add StoryIconPicker popover component"
```

---

## Task 18 — Admin: StoryFeatureBlockEditor component

**Files:**
- Create: `components/admin/story-feature-block-editor.tsx`

- [ ] **Step 18.1: Create the editor**

```tsx
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getImageUrl } from "@/lib/utils/images";
import { uploadStoryImage } from "@/actions/admin/story";
import type { ProductFeatureBlock } from "@/lib/db/types";

interface StoryFeatureBlockEditorProps {
  productId: string;
  block: ProductFeatureBlock;
  index: number;
  onChange: (next: ProductFeatureBlock) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function StoryFeatureBlockEditor({
  productId,
  block,
  index,
  onChange,
  onRemove,
  canRemove,
}: StoryFeatureBlockEditorProps) {
  const [isUploading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      try {
        const result = await uploadStoryImage(productId, fd);
        if (result.success && result.url) {
          onChange({ ...block, image_url: result.url });
          toast.success("Image téléchargée");
        } else {
          setError(result.error || "Erreur lors de l'upload");
          toast.error(result.error || "Erreur lors de l'upload");
        }
      } catch (err) {
        console.error("[StoryFeatureBlockEditor] upload failed", err);
        toast.error("Erreur inattendue");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          Bloc {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label="Supprimer le bloc"
        >
          <HugeiconsIcon icon={Delete02Icon} size={16} />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`block-${index}-title`}>Titre</Label>
        <Input
          id={`block-${index}-title`}
          value={block.title}
          maxLength={120}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Un argument, une phrase"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`block-${index}-body`}>Texte</Label>
          <span className="text-xs text-muted-foreground">
            {block.body.length}/600
          </span>
        </div>
        <Textarea
          id={`block-${index}-body`}
          value={block.body}
          maxLength={600}
          rows={4}
          onChange={(e) => onChange({ ...block, body: e.target.value })}
          placeholder="Décris l'argument en 2–4 phrases"
        />
      </div>

      <div className="space-y-2">
        <Label>Image (optionnelle)</Label>
        {block.image_url ? (
          <div className="relative h-40 w-full overflow-hidden rounded-md border">
            <Image
              src={getImageUrl(block.image_url)}
              alt={block.image_alt ?? ""}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => onChange({ ...block, image_url: undefined, image_alt: undefined })}
            >
              Retirer
            </Button>
          </div>
        ) : (
          <label className="flex h-24 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-accent/50">
            <HugeiconsIcon icon={Upload04Icon} size={18} />
            {isUploading ? "Téléchargement..." : "Télécharger une image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = ""; // allow re-selecting same file
              }}
            />
          </label>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {block.image_url && (
        <div className="space-y-2">
          <Label htmlFor={`block-${index}-alt`}>Texte alternatif</Label>
          <Input
            id={`block-${index}-alt`}
            value={block.image_alt ?? ""}
            maxLength={200}
            onChange={(e) => onChange({ ...block, image_alt: e.target.value })}
            placeholder="Description de l'image pour l'accessibilité"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 18.2: Verify tsc + commit**

```bash
npx tsc --noEmit
git add components/admin/story-feature-block-editor.tsx
git commit -m "feat(admin): add StoryFeatureBlockEditor with R2 image upload"
```

---

## Task 19 — Admin: ProductStorySection (aggregates everything)

**Files:**
- Create: `components/admin/product-story-section.tsx`

- [ ] **Step 19.1: Create the section component**

```tsx
"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StoryIconPicker } from "./story-icon-picker";
import { StoryFeatureBlockEditor } from "./story-feature-block-editor";
import type {
  ProductHighlight,
  ProductFeatureBlock,
  ProductFaqItem,
} from "@/lib/db/types";
import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";

interface ProductStorySectionProps {
  productId: string;
  tagline: string | null;
  highlights: ProductHighlight[] | null;
  featureBlocks: ProductFeatureBlock[] | null;
  faq: ProductFaqItem[] | null;
}

const MIN_HL = 3;
const MAX_HL = 6;
const MIN_FB = 2;
const MAX_FB = 4;
const MAX_FAQ = 5;
const DEFAULT_ICON = HIGHLIGHT_ICON_NAMES[0];

export function ProductStorySection({
  productId,
  tagline: initialTagline,
  highlights: initialHighlights,
  featureBlocks: initialFeatureBlocks,
  faq: initialFaq,
}: ProductStorySectionProps) {
  const [tagline, setTagline] = useState<string>(initialTagline ?? "");
  const [highlights, setHighlights] = useState<ProductHighlight[]>(
    () => initialHighlights ?? [],
  );
  const [featureBlocks, setFeatureBlocks] = useState<ProductFeatureBlock[]>(
    () => initialFeatureBlocks ?? [],
  );
  const [faq, setFaq] = useState<ProductFaqItem[]>(() => initialFaq ?? []);

  // Serialized hidden-input values sent with the main form submit.
  const hiddenValues = useMemo(
    () => ({
      tagline: tagline.trim(),
      highlights_json:
        highlights.length === 0 ? "" : JSON.stringify(highlights),
      feature_blocks_json:
        featureBlocks.length === 0 ? "" : JSON.stringify(featureBlocks),
      faq_json: faq.length === 0 ? "" : JSON.stringify(faq),
    }),
    [tagline, highlights, featureBlocks, faq],
  );

  return (
    <div className="space-y-8">
      <input type="hidden" name="tagline" value={hiddenValues.tagline} />
      <input type="hidden" name="highlights" value={hiddenValues.highlights_json} />
      <input type="hidden" name="feature_blocks" value={hiddenValues.feature_blocks_json} />
      <input type="hidden" name="faq" value={hiddenValues.faq_json} />

      {/* Tagline */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="story-tagline">Accroche</Label>
          <span className="text-xs text-muted-foreground">{tagline.length}/200</span>
        </div>
        <Textarea
          id="story-tagline"
          rows={2}
          value={tagline}
          maxLength={200}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Ex. Un écran plus grand, une autonomie qui dure."
        />
      </div>

      {/* Highlights */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Points forts</Label>
          <p className="text-xs text-muted-foreground">
            Entre {MIN_HL} et {MAX_HL} — ou laisse vide pour masquer ce bloc
          </p>
        </div>
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <StoryIconPicker
                value={h.icon}
                onChange={(icon) => {
                  setHighlights((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, icon } : x)),
                  );
                }}
              />
              <Input
                value={h.label}
                maxLength={80}
                placeholder="Ex. Charge rapide 33 W"
                onChange={(e) => {
                  const label = e.target.value;
                  setHighlights((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, label } : x)),
                  );
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Supprimer le point fort"
                onClick={() => setHighlights((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={highlights.length >= MAX_HL}
          onClick={() => setHighlights((prev) => [...prev, { icon: DEFAULT_ICON, label: "" }])}
        >
          <HugeiconsIcon icon={Add01Icon} size={14} className="mr-1.5" />
          Ajouter un point fort
        </Button>
        {highlights.length > 0 && highlights.length < MIN_HL && (
          <p className="text-xs text-destructive">
            Ajoute au moins {MIN_HL} points forts ou supprime-les tous pour masquer le bloc.
          </p>
        )}
      </div>

      {/* Feature blocks */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Feature blocks</Label>
          <p className="text-xs text-muted-foreground">
            Entre {MIN_FB} et {MAX_FB} — ou laisse vide pour masquer ce bloc
          </p>
        </div>
        <div className="space-y-3">
          {featureBlocks.map((block, i) => (
            <StoryFeatureBlockEditor
              key={i}
              productId={productId}
              block={block}
              index={i}
              canRemove={featureBlocks.length > 0}
              onChange={(next) =>
                setFeatureBlocks((prev) => prev.map((x, idx) => (idx === i ? next : x)))
              }
              onRemove={() =>
                setFeatureBlocks((prev) => prev.filter((_, idx) => idx !== i))
              }
            />
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={featureBlocks.length >= MAX_FB}
          onClick={() =>
            setFeatureBlocks((prev) => [...prev, { title: "", body: "" }])
          }
        >
          <HugeiconsIcon icon={Add01Icon} size={14} className="mr-1.5" />
          Ajouter un bloc
        </Button>
        {featureBlocks.length > 0 && featureBlocks.length < MIN_FB && (
          <p className="text-xs text-destructive">
            Ajoute au moins {MIN_FB} blocs ou supprime-les tous pour masquer le bloc.
          </p>
        )}
      </div>

      {/* FAQ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>FAQ</Label>
          <p className="text-xs text-muted-foreground">Jusqu'à {MAX_FAQ} questions</p>
        </div>
        <div className="space-y-3">
          {faq.map((item, i) => (
            <div key={i} className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">
                  Question {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Supprimer la question"
                  onClick={() => setFaq((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                </Button>
              </div>
              <Input
                value={item.question}
                maxLength={160}
                placeholder="La question"
                onChange={(e) => {
                  const question = e.target.value;
                  setFaq((prev) => prev.map((x, idx) => (idx === i ? { ...x, question } : x)));
                }}
              />
              <Textarea
                value={item.answer}
                rows={3}
                maxLength={600}
                placeholder="La réponse"
                onChange={(e) => {
                  const answer = e.target.value;
                  setFaq((prev) => prev.map((x, idx) => (idx === i ? { ...x, answer } : x)));
                }}
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={faq.length >= MAX_FAQ}
          onClick={() => setFaq((prev) => [...prev, { question: "", answer: "" }])}
        >
          <HugeiconsIcon icon={Add01Icon} size={14} className="mr-1.5" />
          Ajouter une question
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 19.2: Verify tsc + commit**

```bash
npx tsc --noEmit
git add components/admin/product-story-section.tsx
git commit -m "feat(admin): add ProductStorySection form component"
```

---

## Task 20 — Wire the Story section into `product-form-sections.tsx`

**Files:**
- Modify: `components/admin/product-form-sections.tsx:42-53`, `:167-218`, `:264+`

- [ ] **Step 20.1: Import the new section component at the top**

After the existing imports (around line 42), add:

```ts
import { ProductStorySection } from "./product-story-section";
```

- [ ] **Step 20.2: Add the Story entry to the `SECTIONS` array**

Change (around line 45–53):

```ts
const SECTIONS: SectionDef[] = [
  { id: "section-general", label: "Informations" },
  { id: "section-category", label: "Catégorie" },
  { id: "section-specs", label: "Caractéristiques" },
  { id: "section-pricing", label: "Tarification" },
  { id: "section-images", label: "Images" },
  { id: "section-seo", label: "SEO" },
  { id: "section-visibility", label: "Visibilité" },
];
```

to:

```ts
const SECTIONS: SectionDef[] = [
  { id: "section-general", label: "Informations" },
  { id: "section-category", label: "Catégorie" },
  { id: "section-specs", label: "Caractéristiques" },
  { id: "section-story", label: "Story" },
  { id: "section-pricing", label: "Tarification" },
  { id: "section-images", label: "Images" },
  { id: "section-seo", label: "SEO" },
  { id: "section-visibility", label: "Visibilité" },
];
```

- [ ] **Step 20.3: Relabel the Description field in "Informations générales" to clarify its new role**

Around line 209–216, change:

```tsx
<div className="space-y-2">
  <Label>Description</Label>
  <DescriptionEditor
    name="description"
    descriptionType={product.description_type}
    defaultValue={product.description}
  />
</div>
```

to:

```tsx
<div className="space-y-2">
  <Label>Contenu complémentaire</Label>
  <p className="text-xs text-muted-foreground">
    S'affiche dans le bloc « zone libre » de la Story, sous les blocs structurés.
  </p>
  <DescriptionEditor
    name="description"
    descriptionType={product.description_type}
    defaultValue={product.description}
  />
</div>
```

- [ ] **Step 20.4: Insert a new `<Card id="section-story">` between Caractéristiques and Tarification**

After the closing `</Card>` of the `section-specs` card (around line 241, just before `{/* Section: Tarification & Stock */}`), insert:

```tsx
          {/* Section: Story */}
          <Card id="section-story">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>Story produit</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Blocs éditoriaux rendus en pleine largeur sur la fiche produit.
                    Tous les blocs sont optionnels.
                  </p>
                </div>
                {!isNew && product.slug && (
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <a href={`/p/${product.slug}`} target="_blank" rel="noopener noreferrer">
                      Aperçu
                    </a>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ProductStorySection
                productId={product.id}
                tagline={product.tagline}
                highlights={product.highlights}
                featureBlocks={product.feature_blocks}
                faq={product.faq}
              />
            </CardContent>
          </Card>
```

The preview button only appears on non-draft products (a draft has no slug yet) and links to the published storefront page. Since the button text is plain French, it renders the currently **saved** version — editing the form won't update the preview until the admin clicks "Mettre à jour".

- [ ] **Step 20.5: Verify tsc + test**

```bash
npx tsc --noEmit
npm run lint -- --max-warnings 0 2>&1 | tail -20
```

Expected: no TS errors, no new lint errors.

- [ ] **Step 20.6: Visual check: full round-trip in admin + storefront**

```bash
npm run dev
```

In a browser:

1. Go to http://localhost:3000/admin/login and sign in as an admin (or use the existing dev credentials).
2. Open any existing product in the admin: `/products/<id>/edit`.
3. Scroll to the new **Story produit** section.
4. Fill in:
   - A tagline (≤ 200 chars)
   - 3 highlights with different icons
   - 2 feature blocks — one with an uploaded image, one without
   - 2 FAQ items
5. Click "Mettre à jour" — expect a success toast.
6. Open the product page on the storefront (`/p/<slug>`). Verify:
   - Hero renders as before.
   - Below the hero, the full-width Story section shows tagline → highlights → feature blocks (zig-zag) → FAQ accordion → (if the product had a legacy description) free content.
   - The Caractéristiques grid appears below the Story.
   - Mobile (< 640px): all blocks stack vertically, feature block images appear above their text.

Stop the dev server with Ctrl+C.

- [ ] **Step 20.7: Commit**

```bash
git add components/admin/product-form-sections.tsx
git commit -m "feat(admin): add Story section to product form"
```

---

## Deferred: React component snapshot tests

The spec mentions snapshot tests for `components/storefront/product-story/*`. The project's Vitest config is currently `environment: "node"` with only `.test.ts` (not `.tsx`) includes, and has no Testing Library / jsdom setup. Adding that infrastructure is out of scope for this PR.

The risks covered by the missing snapshot tests are mitigated by:

- **Empty-state logic** — trivially 5 lines of `!!` checks in `ProductStory` (no extraction into a helper needed; violates YAGNI for a 5-line check).
- **Per-block rendering** — each block is read-only presentational; a visual smoke test in Task 14.4 / 20.6 catches issues.
- **Props shape** — `tsc --noEmit` catches every signature mismatch at build time.

A follow-up PR can add `@testing-library/react` + jsdom if the team wants snapshot tests for all storefront components, not just the story blocks.

---

## Task 21 — Final verification + PR

- [ ] **Step 21.1: Run the full pre-commit suite locally**

```bash
npx tsc --noEmit && npm run lint && npm run test
```

Expected: all three succeed.

- [ ] **Step 21.2: Inspect git history**

```bash
git log --oneline main..feat/product-story-template
```

Expected: one commit per Task 1–20 plus the existing Task 0 spec commit (~18 commits).

- [ ] **Step 21.3: Push the branch**

```bash
git push -u origin feat/product-story-template
```

- [ ] **Step 21.4: Open a PR — report URL, do NOT merge**

```bash
gh pr create --title "feat(storefront): Apple-like Product Story template" --body "$(cat <<'EOF'
## Summary

- Add four nullable columns to `products` (`tagline`, `highlights`, `feature_blocks`, `faq`) via an expand-only migration.
- Render a new full-width `<ProductStory>` section on the product page with five optional blocks (tagline, highlights grid, zig-zag feature blocks, FAQ accordion, free content fallback).
- Add a "Story" section in the admin product editor with per-block validation, icon picker (50 curated Hugeicons), and R2 image upload for feature blocks.
- Preserve backward compatibility: every existing product keeps its current description, now surfaced in the free-content block with `prose-lg` sizing.

Spec: [`docs/superpowers/specs/2026-04-16-product-story-template-design.md`](docs/superpowers/specs/2026-04-16-product-story-template-design.md)
Plan: [`docs/superpowers/plans/2026-04-16-product-story-template.md`](docs/superpowers/plans/2026-04-16-product-story-template.md)

## Test plan

- [x] Unit: zod validation edge cases (3 files)
- [x] Unit: JSON parse / hydrate fallback on malformed data
- [x] Unit: icon shortlist 1:1 coverage
- [x] Manual: legacy product still renders (description surfaces in free-content block)
- [x] Manual: new product with all 5 blocks renders correctly on desktop + mobile
- [x] Manual: admin round-trip (edit → save → reflected on storefront)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Report the PR URL back to the user. Do **not** merge without explicit approval.

---

## Self-review checklist (for the engineer implementing)

Before marking the plan done:

- [ ] Every `tsc` check passed at the end of its task.
- [ ] Every new test file passed (not skipped).
- [ ] Every commit message starts with a conventional-commits type + scope from the approved enum (`storefront`, `admin`, `db`).
- [ ] No `git add -A` used — all `git add` commands are targeted to specific paths (avoids bundling `.claude/settings.local.json` and untracked AI tool folders).
- [ ] Branch is `feat/product-story-template` (unchanged since creation).
- [ ] PR body references spec + plan.
- [ ] PR is **not merged** until the user says so.
