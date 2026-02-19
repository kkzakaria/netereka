# AI Product Creation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter un bouton "✦ Créer avec l'IA" sur la page produits qui ouvre un modal permettant de générer un produit complet (texte, variantes, images) depuis un nom + marque, avec aperçu avant création.

**Architecture:** Une nouvelle action `generateProductBlueprint` orchestre la recherche web (specs + images), appelle le LLM pour générer le blueprint complet (infos, variantes), puis retourne les données pour prévisualisation. Une seconde action `createProductFromBlueprint` crée le produit, les variantes, télécharge les images vers R2 et retourne l'ID pour redirection. Un modal 2 étapes (formulaire → aperçu) pilote le tout.

**Tech Stack:** Cloudflare Workers AI (Llama 3.1 8B), Brave Search Image API, Zod, Vitest, Next.js Server Actions, shadcn/ui Dialog, nanoid, Tailwind CSS 4.

---

## Task 1: Extend AI schemas — `productBlueprintSchema`

**Files:**
- Modify: `lib/ai/schemas.ts`

**Step 1: Add the schema and types**

In `lib/ai/schemas.ts`, append after the existing exports:

```typescript
export const productVariantBlueprintSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().int().min(0),
  stock_quantity: z.coerce.number().int().min(0).default(5),
  attributes: z.record(z.string(), z.string()).default({}),
});

export const productBlueprintSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional().default(""),
  base_price: z.coerce.number().int().min(0),
  description: z.string().max(500),
  short_description: z.string().max(150),
  meta_title: z.string().max(60),
  meta_description: z.string().max(160),
  categoryId: z.string(),
  variants: z.array(productVariantBlueprintSchema).min(0).max(20),
});

export type ProductVariantBlueprint = z.infer<typeof productVariantBlueprintSchema>;
export type ProductBlueprint = z.infer<typeof productBlueprintSchema>;
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error TS|✓" | head -20
```
Expected: no TypeScript errors related to `lib/ai/schemas.ts`.

**Step 3: Commit**

```bash
git add lib/ai/schemas.ts
git commit -m "feat(ai): add productBlueprintSchema for full product generation"
```

---

## Task 2: Add `productBlueprintPrompt` to prompts

**Files:**
- Modify: `lib/ai/prompts.ts`

**Step 1: Append the prompt function**

In `lib/ai/prompts.ts`, append after `bannerImagePrompt`:

```typescript
export function productBlueprintPrompt(input: {
  name: string;
  brand?: string;
  specs?: string;
  categories: Array<{ id: string; name: string; parentName?: string }>;
}) {
  const categoryList = input.categories
    .map(
      (c) =>
        `- id: "${c.id}", nom: "${c.parentName ? `${c.parentName} > ${c.name}` : c.name}"`
    )
    .join("\n");

  const context = [
    `Nom du produit: ${input.name}`,
    input.brand ? `Marque: ${input.brand}` : null,
    input.specs
      ? `Informations trouvées en ligne:\n---\n${input.specs}\n---`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    system: `Tu es un expert e-commerce pour le marché ivoirien (Côte d'Ivoire). Les prix sont en XOF (Franc CFA). Tu génères des données produit complètes.

Voici les catégories disponibles :
${categoryList}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après. Le JSON doit avoir exactement ces clés :
- "name": nom exact du produit (string)
- "brand": marque du produit (string, peut être vide)
- "base_price": prix de base en XOF, nombre entier (ex: 1049000)
- "description": description détaillée (2-3 phrases, max 500 caractères)
- "short_description": résumé accrocheur en une phrase (max 150 caractères)
- "meta_title": titre SEO (max 60 caractères)
- "meta_description": description SEO (max 160 caractères)
- "categoryId": id de la catégorie la plus pertinente parmi la liste ci-dessus (string)
- "variants": tableau de variantes typiques pour ce produit (max 8). Chaque variante a:
  - "name": nom de la variante (ex: "128Go / Noir Titanium")
  - "price": prix en XOF (nombre entier)
  - "stock_quantity": quantité en stock (nombre entier, généralement 3-10)
  - "attributes": objet JSON avec les attributs (ex: {"stockage": "128Go", "couleur": "Noir Titanium"})

Si le produit n'a pas de variantes pertinentes (ex: accessoire simple), retourne variants: [].
Utilise uniquement les informations fournies. Ne pas inventer de spécifications.`,
    user: context,
  };
}
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep "error TS" | head -10
```
Expected: no errors.

**Step 3: Commit**

```bash
git add lib/ai/prompts.ts
git commit -m "feat(ai): add productBlueprintPrompt for full product generation"
```

---

## Task 3: Add `searchProductImages` to search module

**Files:**
- Modify: `lib/ai/search.ts`
- Modify: `__tests__/unit/lib/ai/search.test.ts`

### Step 1: Write failing tests first

Open `__tests__/unit/lib/ai/search.test.ts` and **append** at the end (after the existing `searchProductSpecs` tests):

```typescript
// ─── searchProductImages ────────────────────────────────────────────────────

describe("searchProductImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetch.mockReset();
  });

  it("returns image URLs from Brave Image Search when key is set", async () => {
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { thumbnail: { src: "https://cdn.example.com/img1.jpg" } },
          { thumbnail: { src: "https://cdn.example.com/img2.jpg" } },
        ],
      }),
    });

    const urls = await searchProductImages("iPhone 16 Pro");
    expect(urls).toEqual([
      "https://cdn.example.com/img1.jpg",
      "https://cdn.example.com/img2.jpg",
    ]);
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/images/search"),
      expect.any(Object)
    );
  });

  it("returns empty array when no API key is configured", async () => {
    mocks.getCloudflareContext.mockResolvedValue(NONE);
    const urls = await searchProductImages("iPhone 16 Pro");
    expect(urls).toEqual([]);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("returns empty array when Brave Image Search returns non-ok status", async () => {
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
    mocks.fetch.mockResolvedValue({ ok: false, status: 403 });
    const urls = await searchProductImages("test");
    expect(urls).toEqual([]);
  });

  it("returns empty array when Brave Image Search returns no results", async () => {
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });
    const urls = await searchProductImages("test");
    expect(urls).toEqual([]);
  });

  it("returns empty array on fetch timeout/network error", async () => {
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
    mocks.fetch.mockRejectedValue(new Error("timeout"));
    const urls = await searchProductImages("test");
    expect(urls).toEqual([]);
  });

  it("filters out results with no thumbnail src", async () => {
    mocks.getCloudflareContext.mockResolvedValue(BRAVE_ONLY);
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { thumbnail: { src: "https://cdn.example.com/img1.jpg" } },
          { thumbnail: {} },
          { thumbnail: { src: "https://cdn.example.com/img3.jpg" } },
        ],
      }),
    });
    const urls = await searchProductImages("test");
    expect(urls).toEqual([
      "https://cdn.example.com/img1.jpg",
      "https://cdn.example.com/img3.jpg",
    ]);
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm run test -- __tests__/unit/lib/ai/search.test.ts 2>&1 | tail -20
```
Expected: tests fail with "searchProductImages is not a function" or similar.

**Step 3: Implement `searchProductImages` in `lib/ai/search.ts`**

Add the following types at the top of `lib/ai/search.ts` (after existing interfaces):

```typescript
interface BraveImageSearchResult {
  results?: Array<{ thumbnail?: { src?: string } }>;
}
```

Then append the function before the public API section comment, or after `searchWithGoogle`:

```typescript
/**
 * Search for product images using Brave Image Search.
 * Returns up to 3 thumbnail URLs, or [] on any failure.
 * Only available when BRAVE_SEARCH_API_KEY is configured.
 */
async function searchImagesWithBrave(
  query: string,
  apiKey: string
): Promise<string[]> {
  const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(query)}&count=3&safesearch=strict`;

  let data: BraveImageSearchResult;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(
        `[ai/search] Brave Image Search returned ${res.status} for query="${query}"`
      );
      return [];
    }

    data = (await res.json()) as BraveImageSearchResult;
  } catch (err) {
    console.error("[ai/search] Brave Image Search threw:", err);
    return [];
  }

  return (data.results ?? [])
    .map((r) => r.thumbnail?.src ?? "")
    .filter(Boolean)
    .slice(0, 3);
}
```

And append a public export at the bottom of `lib/ai/search.ts`:

```typescript
/**
 * Search for product images using Brave Image Search.
 * Returns an array of thumbnail URLs (max 3), or [] if unavailable.
 */
export async function searchProductImages(query: string): Promise<string[]> {
  const { env } = await getCloudflareContext();

  if (env.BRAVE_SEARCH_API_KEY) {
    return searchImagesWithBrave(query, env.BRAVE_SEARCH_API_KEY);
  }

  console.warn("[ai/search] No BRAVE_SEARCH_API_KEY — skipping image search");
  return [];
}
```

**Step 4: Run tests to confirm they pass**

```bash
npm run test -- __tests__/unit/lib/ai/search.test.ts 2>&1 | tail -20
```
Expected: all tests PASS.

**Step 5: Commit**

```bash
git add lib/ai/search.ts "__tests__/unit/lib/ai/search.test.ts"
git commit -m "feat(ai): add searchProductImages via Brave Image Search API"
```

---

## Task 4: Add `generateProductBlueprint` server action + tests

**Files:**
- Modify: `actions/admin/ai.ts`
- Modify: `__tests__/unit/actions/admin-ai.test.ts`

### Step 1: Write failing tests

Open `__tests__/unit/actions/admin-ai.test.ts`.

**Add `searchProductImages` to the mocks object** at the top:

```typescript
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(/* ... existing ... */),
  aiRun: vi.fn(),
  getCategoryTree: vi.fn(),
  uploadToR2: vi.fn(),
  searchProductSpecs: vi.fn(),
  searchProductImages: vi.fn(), // ← add this
}));
```

**Add the mock for `searchProductImages`** alongside the existing `@/lib/ai/search` mock:

```typescript
vi.mock("@/lib/ai/search", () => ({
  searchProductSpecs: mocks.searchProductSpecs,
  searchProductImages: mocks.searchProductImages, // ← add this
}));
```

**Add `generateProductBlueprint` to the import**:

```typescript
import {
  generateProductText,
  generateBannerText,
  suggestCategory,
  generateBannerImage,
  generateProductBlueprint, // ← add
} from "@/actions/admin/ai";
```

**Append the test suite at the end of the file**:

```typescript
// ─── generateProductBlueprint ─────────────────────────────────────────────────

describe("generateProductBlueprint", () => {
  const mockBlueprint = {
    name: "iPhone 16 Pro",
    brand: "Apple",
    base_price: 1049000,
    description: "Un smartphone haut de gamme.",
    short_description: "Le meilleur iPhone.",
    meta_title: "iPhone 16 Pro - Achat",
    meta_description: "Achetez l'iPhone 16 Pro sur NETEREKA.",
    categoryId: "cat-1a",
    variants: [
      {
        name: "128Go / Noir",
        price: 1049000,
        stock_quantity: 5,
        attributes: { stockage: "128Go", couleur: "Noir" },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.searchProductSpecs.mockResolvedValue("iPhone 16 Pro specs...");
    mocks.searchProductImages.mockResolvedValue([
      "https://example.com/img1.jpg",
    ]);
    mocks.getCategoryTree.mockResolvedValue(mockCategoryTree);
    mocks.aiRun.mockResolvedValue({
      response: JSON.stringify(mockBlueprint),
    });
  });

  it("requires admin auth", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(
      generateProductBlueprint({ name: "iPhone 16 Pro" })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns error when name is empty", async () => {
    const result = await generateProductBlueprint({ name: "" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns blueprint and imageUrls on success", async () => {
    const result = await generateProductBlueprint({
      name: "iPhone 16 Pro",
      brand: "Apple",
    });
    expect(result.success).toBe(true);
    expect(result.data?.blueprint.name).toBe("iPhone 16 Pro");
    expect(result.data?.blueprint.variants).toHaveLength(1);
    expect(result.data?.imageUrls).toEqual(["https://example.com/img1.jpg"]);
  });

  it("filters out hallucinated categoryId not in category tree", async () => {
    mocks.aiRun.mockResolvedValue({
      response: JSON.stringify({ ...mockBlueprint, categoryId: "cat-fake-999" }),
    });
    const result = await generateProductBlueprint({ name: "iPhone 16 Pro" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("catégorie");
  });

  it("returns error on LLM 429", async () => {
    mocks.aiRun.mockRejectedValue(new Error("429 Too Many Requests"));
    const result = await generateProductBlueprint({ name: "iPhone 16 Pro" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Limite");
  });

  it("continues when searchProductImages fails", async () => {
    mocks.searchProductImages.mockResolvedValue([]);
    const result = await generateProductBlueprint({ name: "iPhone 16 Pro" });
    expect(result.success).toBe(true);
    expect(result.data?.imageUrls).toEqual([]);
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm run test -- __tests__/unit/actions/admin-ai.test.ts 2>&1 | grep -E "FAIL|PASS|generateProductBlueprint" | head -20
```
Expected: `generateProductBlueprint` tests FAIL (function not exported).

**Step 3: Implement `generateProductBlueprint` in `actions/admin/ai.ts`**

First, update the imports at the top of `actions/admin/ai.ts` to add:
- `searchProductImages` from `@/lib/ai/search`
- `productBlueprintPrompt` from `@/lib/ai/prompts`
- `productBlueprintSchema` and its types from `@/lib/ai/schemas`

```typescript
import {
  productTextPrompt,
  bannerTextPrompt,
  categorySuggestionPrompt,
  bannerImagePrompt,
  productBlueprintPrompt, // ← add
} from "@/lib/ai/prompts";
import {
  productTextSchema,
  bannerTextSchema,
  categorySuggestionSchema,
  productBlueprintSchema, // ← add
} from "@/lib/ai/schemas";
import type {
  ProductTextResult,
  BannerTextResult,
  CategorySuggestionResult,
  ProductBlueprint, // ← add
} from "@/lib/ai/schemas";
import { searchProductSpecs, searchProductImages } from "@/lib/ai/search"; // ← add searchProductImages
```

Also add the input schema near the top of the file (alongside the other input schemas):

```typescript
const generateBlueprintInputSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  brand: z.string().optional(),
});
```

Then append the function export:

```typescript
export async function generateProductBlueprint(
  input: z.input<typeof generateBlueprintInputSchema>
): Promise<AiResult<{ blueprint: ProductBlueprint; categoryName: string; imageUrls: string[] }>> {
  await requireAdmin();

  const parsed = generateBlueprintInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Le nom du produit est requis." };
  }

  try {
    const searchQuery = [parsed.data.brand, parsed.data.name]
      .filter(Boolean)
      .join(" ");

    // Run specs search and image search in parallel (both are best-effort)
    const [specs, imageUrls] = await Promise.all([
      searchProductSpecs(searchQuery).catch((err) => {
        console.error("[admin/ai] searchProductSpecs failed:", err);
        return "";
      }),
      searchProductImages(searchQuery).catch((err) => {
        console.error("[admin/ai] searchProductImages failed:", err);
        return [] as string[];
      }),
    ]);

    const tree = await getCategoryTree();
    const categories = flattenCategories(tree);

    if (categories.length === 0) {
      return { success: false, error: "Aucune catégorie disponible." };
    }

    const validIds = new Set(categories.map((c) => c.id));
    const prompt = productBlueprintPrompt({ ...parsed.data, specs, categories });
    const jsonStr = await runTextModel(prompt.system, prompt.user);
    const raw = productBlueprintSchema.parse(JSON.parse(jsonStr));

    if (!validIds.has(raw.categoryId)) {
      return {
        success: false,
        error: "L'IA n'a pas identifié de catégorie valide. Réessayez ou sélectionnez manuellement.",
      };
    }

    const cat = categories.find((c) => c.id === raw.categoryId);
    const categoryName = cat
      ? (cat.parentName ? `${cat.parentName} > ${cat.name}` : cat.name)
      : raw.categoryId;

    return {
      success: true,
      data: { blueprint: raw, categoryName, imageUrls },
    };
  } catch (error) {
    console.error("[admin/ai] generateProductBlueprint error:", error);
    if (error instanceof Error && error.message.includes("429")) {
      return {
        success: false,
        error: "Limite IA quotidienne atteinte. Réessayez demain.",
      };
    }
    return {
      success: false,
      error: "Impossible de générer le produit. Réessayez.",
    };
  }
}
```

**Step 4: Run tests to confirm they pass**

```bash
npm run test -- __tests__/unit/actions/admin-ai.test.ts 2>&1 | tail -30
```
Expected: all `generateProductBlueprint` tests PASS.

**Step 5: Commit**

```bash
git add actions/admin/ai.ts "__tests__/unit/actions/admin-ai.test.ts"
git commit -m "feat(ai): add generateProductBlueprint server action"
```

---

## Task 5: Add `createProductFromBlueprint` server action + tests

**Files:**
- Modify: `actions/admin/ai.ts`
- Modify: `__tests__/unit/actions/admin-ai.test.ts`

### Step 1: Write failing tests

In `__tests__/unit/actions/admin-ai.test.ts`, **add DB mocks** to the `vi.hoisted` block:

```typescript
const mocks = vi.hoisted(() => ({
  // ... existing mocks ...
  execute: vi.fn(),
  query: vi.fn(),
}));
```

**Add the `@/lib/db` mock** alongside the other mocks:

```typescript
vi.mock("@/lib/db", () => ({
  execute: mocks.execute,
  query: mocks.query,
  queryFirst: vi.fn().mockResolvedValue(null),
}));
```

**Add `createProductFromBlueprint` to the import**:

```typescript
import {
  // ... existing ...
  createProductFromBlueprint, // ← add
} from "@/actions/admin/ai";
```

**Append the test suite**:

```typescript
// ─── createProductFromBlueprint ───────────────────────────────────────────────

describe("createProductFromBlueprint", () => {
  const blueprint = {
    name: "iPhone 16 Pro",
    brand: "Apple",
    base_price: 1049000,
    description: "Description produit.",
    short_description: "Résumé.",
    meta_title: "iPhone 16 Pro",
    meta_description: "Meta description.",
    categoryId: "cat-1a",
    variants: [
      {
        name: "128Go / Noir",
        price: 1049000,
        stock_quantity: 5,
        attributes: { stockage: "128Go", couleur: "Noir" },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.execute.mockResolvedValue(undefined);
    mocks.query.mockResolvedValue([]);
    mocks.uploadToR2.mockResolvedValue("products/id/img.jpg");
  });

  it("requires admin auth", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(
      createProductFromBlueprint({ blueprint, imageUrls: [] })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("creates product and variants, returns id", async () => {
    const result = await createProductFromBlueprint({
      blueprint,
      imageUrls: [],
    });
    expect(result.success).toBe(true);
    expect(result.id).toBe("mock-nano-id");
    // 1 product INSERT + 1 variant INSERT
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });

  it("downloads and uploads images when imageUrls provided", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }));
    const result = await createProductFromBlueprint({
      blueprint,
      imageUrls: ["https://example.com/img1.jpg"],
    });
    expect(result.success).toBe(true);
    expect(mocks.uploadToR2).toHaveBeenCalledTimes(1);
    // product INSERT + variant INSERT + image INSERT = 3 execute calls
    expect(mocks.execute).toHaveBeenCalledTimes(3);
    vi.unstubAllGlobals();
  });

  it("skips image if download fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await createProductFromBlueprint({
      blueprint,
      imageUrls: ["https://example.com/broken.jpg"],
    });
    expect(result.success).toBe(true);
    expect(mocks.uploadToR2).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("returns error on DB failure", async () => {
    mocks.execute.mockRejectedValue(new Error("D1 write error"));
    const result = await createProductFromBlueprint({
      blueprint,
      imageUrls: [],
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
npm run test -- __tests__/unit/actions/admin-ai.test.ts 2>&1 | grep -E "FAIL|createProductFromBlueprint" | head -10
```

**Step 3: Implement `createProductFromBlueprint` in `actions/admin/ai.ts`**

Add `execute` from `@/lib/db` to the existing imports:

```typescript
import { execute } from "@/lib/db";
```

Also add `slugify` from `@/lib/utils` to the imports:

```typescript
import { slugify } from "@/lib/utils";
```

Add the input schema:

```typescript
const createFromBlueprintInputSchema = z.object({
  blueprint: productBlueprintSchema,
  imageUrls: z.array(z.string().url()).default([]),
});
```

Then append the function:

```typescript
async function downloadImageToR2(
  imageUrl: string,
  productId: string
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0) return null;
    const id = nanoid();
    const key = `products/${productId}/${id}.jpg`;
    const file = new File([buffer], `${id}.jpg`, { type: "image/jpeg" });
    await uploadToR2(file, key);
    return `/images/${key}`;
  } catch {
    return null;
  }
}

export async function createProductFromBlueprint(
  input: z.input<typeof createFromBlueprintInputSchema>
): Promise<AiResult<never> & { id?: string }> {
  await requireAdmin();

  const parsed = createFromBlueprintInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }

  const { blueprint, imageUrls } = parsed.data;
  const id = nanoid();
  const slug = slugify(blueprint.name);

  try {
    // 1. Insert product (draft=1, published when saved in editor)
    await execute(
      `INSERT INTO products (id, category_id, name, slug, description, short_description,
         base_price, sku, brand, is_active, is_draft,
         meta_title, meta_description, stock_quantity, low_stock_threshold,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 1, ?, ?, 0, 5, datetime('now'), datetime('now'))`,
      [
        id,
        blueprint.categoryId,
        blueprint.name,
        slug,
        blueprint.description || null,
        blueprint.short_description || null,
        blueprint.base_price,
        blueprint.brand || null,
        blueprint.meta_title || null,
        blueprint.meta_description || null,
      ]
    );

    // 2. Insert variants
    for (let i = 0; i < blueprint.variants.length; i++) {
      const v = blueprint.variants[i];
      const vid = nanoid();
      await execute(
        `INSERT INTO product_variants (id, product_id, name, sku, price, stock_quantity,
           attributes, is_active, sort_order)
         VALUES (?, ?, ?, NULL, ?, ?, ?, 1, ?)`,
        [
          vid,
          id,
          v.name,
          v.price,
          v.stock_quantity,
          JSON.stringify(v.attributes),
          i,
        ]
      );
    }

    // 3. Download images → R2 (best-effort, don't block on failure)
    for (let i = 0; i < imageUrls.length; i++) {
      const storedUrl = await downloadImageToR2(imageUrls[i], id).catch(() => null);
      if (!storedUrl) continue;
      const iid = nanoid();
      await execute(
        `INSERT INTO product_images (id, product_id, url, alt, sort_order, is_primary)
         VALUES (?, ?, ?, NULL, ?, ?)`,
        [iid, id, storedUrl, i, i === 0 ? 1 : 0]
      );
    }

    return { success: true, id };
  } catch (error) {
    console.error("[admin/ai] createProductFromBlueprint error:", error);
    return {
      success: false,
      error: "Erreur lors de la création du produit. Réessayez.",
    };
  }
}
```

**Step 4: Run all AI tests**

```bash
npm run test -- __tests__/unit/actions/admin-ai.test.ts 2>&1 | tail -30
```
Expected: all tests PASS.

**Step 5: Commit**

```bash
git add actions/admin/ai.ts "__tests__/unit/actions/admin-ai.test.ts"
git commit -m "feat(ai): add createProductFromBlueprint server action"
```

---

## Task 6: Create `AiCreateProductModal` component

**Files:**
- Create: `components/admin/ai-create-product-modal.tsx`

This is a `"use client"` component. No test needed (UI component, no business logic).

**Step 1: Create the file**

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateProductBlueprint, createProductFromBlueprint } from "@/actions/admin/ai";
import type { ProductBlueprint } from "@/lib/ai/schemas";

interface AiCreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "form" | "preview";

interface GeneratedData {
  blueprint: ProductBlueprint;
  categoryName: string;
  imageUrls: string[];
}

export function AiCreateProductModal({
  open,
  onOpenChange,
}: AiCreateProductModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [generated, setGenerated] = useState<GeneratedData | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isCreating, startCreating] = useTransition();

  function handleClose(open: boolean) {
    if (!open) {
      // Reset on close
      setStep("form");
      setName("");
      setBrand("");
      setGenerated(null);
    }
    onOpenChange(open);
  }

  function handleGenerate() {
    if (!name.trim()) {
      toast.error("Le nom du produit est requis");
      return;
    }
    startGenerating(async () => {
      const result = await generateProductBlueprint({
        name: name.trim(),
        brand: brand.trim() || undefined,
      });
      if (result.success && result.data) {
        setGenerated(result.data);
        setStep("preview");
      } else {
        toast.error(result.error || "Erreur lors de la génération");
      }
    });
  }

  function handleConfirm() {
    if (!generated) return;
    startCreating(async () => {
      const result = await createProductFromBlueprint({
        blueprint: generated.blueprint,
        imageUrls: generated.imageUrls,
      });
      if (result.success && result.id) {
        toast.success("Produit créé avec succès");
        handleClose(false);
        router.push(`/products/${result.id}/edit`);
      } else {
        toast.error(result.error || "Erreur lors de la création");
      }
    });
  }

  const bp = generated?.blueprint;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>✨</span>
            <span>Créer un produit avec l&apos;IA</span>
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "L'IA va rechercher les informations du produit et générer son contenu, ses variantes et ses images."
              : "Vérifiez les informations générées avant de créer le produit."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ai-product-name">Nom du produit *</Label>
              <Input
                id="ai-product-name"
                placeholder="ex: iPhone 16 Pro, Samsung Galaxy S25..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                disabled={isGenerating}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-brand">Marque (optionnel)</Label>
              <Input
                id="ai-brand"
                placeholder="ex: Apple, Samsung, Sony..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                disabled={isGenerating}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isGenerating}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !name.trim()}
                className="flex-1 gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Génération...
                  </>
                ) : (
                  <>✨ Générer</>
                )}
              </Button>
            </div>
            {isGenerating && (
              <p className="text-center text-sm text-muted-foreground animate-pulse">
                Recherche des informations et génération en cours...
              </p>
            )}
          </div>
        )}

        {step === "preview" && bp && (
          <div className="space-y-4 pt-2">
            {/* Product info */}
            <div className="rounded-lg border bg-muted/40 p-4 space-y-1.5 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-base">{bp.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {bp.base_price.toLocaleString("fr-FR")} XOF
                </span>
              </div>
              {bp.brand && (
                <p className="text-muted-foreground">Marque : {bp.brand}</p>
              )}
              <p className="text-muted-foreground">
                Catégorie : {generated?.categoryName}
              </p>
              <p className="mt-2">{bp.short_description}</p>
            </div>

            {/* Images preview */}
            {generated && generated.imageUrls.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Images ({generated.imageUrls.length})
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {generated.imageUrls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt={`Image ${i + 1}`}
                      className="h-20 w-20 shrink-0 rounded-md object-cover border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Variants */}
            {bp.variants.length > 0 ? (
              <div>
                <p className="text-sm font-medium mb-2">
                  Variantes ({bp.variants.length})
                </p>
                <div className="rounded-md border text-sm overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-3 py-2 font-medium">Nom</th>
                        <th className="text-right px-3 py-2 font-medium">Prix XOF</th>
                        <th className="text-right px-3 py-2 font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bp.variants.map((v, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2">{v.name}</td>
                          <td className="px-3 py-2 text-right">
                            {v.price.toLocaleString("fr-FR")}
                          </td>
                          <td className="px-3 py-2 text-right">{v.stock_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune variante générée. Vous pourrez en ajouter dans l&apos;éditeur.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isCreating}
                className="flex-1"
              >
                ← Modifier
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isCreating}
                className="flex-1 gap-2"
              >
                {isCreating ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Création...
                  </>
                ) : (
                  "Confirmer et créer"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep "error TS" | head -10
```
Expected: no errors.

**Step 3: Commit**

```bash
git add "components/admin/ai-create-product-modal.tsx"
git commit -m "feat(admin): add AiCreateProductModal component with 2-step flow"
```

---

## Task 7: Wire modal into products page

**Files:**
- Modify: `app/(admin)/products/products-page-client.tsx`
- Modify: `app/(admin)/products/page.tsx`

### Step 1: Update `ProductsPageClient` to add the modal button

Replace the content of `app/(admin)/products/products-page-client.tsx` with:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductTable } from "@/components/admin/product-table";
import { ProductCardMobile } from "@/components/admin/product-card-mobile";
import { ResponsiveDataList } from "@/components/admin/responsive-data-list";
import { AdminMobileFilterSheet } from "@/components/admin/mobile-filter-sheet";
import { ViewSwitcher } from "@/components/admin/view-switcher";
import { AiCreateProductModal } from "@/components/admin/ai-create-product-modal";

interface ProductData {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  category_name?: string | null;
  base_price: number;
  stock_quantity: number;
  is_active: number;
  is_featured: number;
  image_url?: string | null;
}

interface ProductsPageClientProps {
  products: ProductData[];
  categories: { id: string; name: string }[];
  totalCount: number;
}

export function ProductsPageClient({
  products,
  categories,
  totalCount,
}: ProductsPageClientProps) {
  const [aiModalOpen, setAiModalOpen] = useState(false);

  return (
    <>
      <AiCreateProductModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
      />

      {/* Mobile toolbar */}
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="flex items-center gap-2">
          <AdminMobileFilterSheet categories={categories} basePath="/products" />
          <ViewSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAiModalOpen(true)}
            className="gap-1.5"
          >
            <span>✨</span>
            <span>IA</span>
          </Button>
          <Button asChild size="sm">
            <Link href="/products/new">Nouveau</Link>
          </Button>
        </div>
      </div>

      {/* Product count (mobile) */}
      <p className="mb-3 text-sm text-muted-foreground lg:hidden">
        {totalCount} produit(s)
      </p>

      {/* Responsive data list */}
      <ResponsiveDataList
        data={products}
        renderTable={(data) => <ProductTable products={data} />}
        renderCard={(product) => <ProductCardMobile product={product} />}
        emptyMessage="Aucun produit trouvé"
      />
    </>
  );
}
```

### Step 2: Update `app/(admin)/products/page.tsx` — add desktop "Créer avec l'IA" button

The desktop toolbar is in a Server Component (`page.tsx`). Since we need `onClick`, we need to move the button into the Client Component. The cleanest approach: pass an `onAiCreate` prop... but that's complex. Instead, **add a second client-only button group** rendered by `ProductsPageClient` for the desktop header too.

Replace the desktop filter/button block in `page.tsx` (lines 73-81):

```tsx
{/* Desktop filters - instant filtering */}
<div className="hidden items-center justify-between gap-3 lg:flex">
  <ProductFilters
    categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    className="flex-1"
  />
  <ProductsPageActions />
</div>
```

And add `ProductsPageActions` as a small exported client component inline in `products-page-client.tsx`:

```typescript
// Add after the main ProductsPageClient export:

export function ProductsPageActions() {
  const [aiModalOpen, setAiModalOpen] = useState(false);

  return (
    <>
      <AiCreateProductModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setAiModalOpen(true)}
          className="gap-2"
        >
          <span>✨</span>
          Créer avec l&apos;IA
        </Button>
        <Button asChild>
          <Link href="/products/new">Nouveau produit</Link>
        </Button>
      </div>
    </>
  );
}
```

Then update the import in `page.tsx`:

```typescript
import { ProductsPageClient, ProductsPageActions } from "./products-page-client";
```

And replace the desktop button:

```tsx
<div className="hidden items-center justify-between gap-3 lg:flex">
  <ProductFilters
    categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    className="flex-1"
  />
  <ProductsPageActions />
</div>
```

Remove the standalone `<Button asChild><Link href="/products/new">Nouveau produit</Link></Button>` that was there before.

**Step 3: Verify TypeScript and lint**

```bash
npm run build 2>&1 | grep "error TS" | head -10
npm run lint 2>&1 | grep -v "^$" | tail -20
```
Expected: no errors.

**Step 4: Run full test suite**

```bash
npm run test 2>&1 | tail -20
```
Expected: all tests PASS.

**Step 5: Commit**

```bash
git add "app/(admin)/products/products-page-client.tsx" "app/(admin)/products/page.tsx"
git commit -m "feat(admin): wire AI product creation modal into products page"
```

---

## Task 8: Final verification + PR

**Step 1: Run complete test suite and linter**

```bash
npm run test 2>&1 | tail -10
npm run lint 2>&1 | grep -E "error|warning" | grep -v "node_modules" | head -20
```
Expected: all tests pass, no lint errors.

**Step 2: Create branch and PR**

```bash
git checkout -b feat/ai-product-creation main
git rebase main feat/ai-product-creation
# (or cherry-pick the commits if already on a feature branch)
gh pr create --title "feat(ai): AI-powered full product creation from name+brand" --body "$(cat <<'EOF'
## Summary
- Adds \`generateProductBlueprint\` server action that orchestrates web search (specs + images) and LLM to produce a full product blueprint (info, variants, images)
- Adds \`createProductFromBlueprint\` server action that inserts the product, variants, and downloads images to R2
- Adds \`AiCreateProductModal\` 2-step component: form input → preview → confirm & create
- Wires the modal into the products list page (desktop + mobile)

## Test plan
- [ ] Open /products → click "✨ Créer avec l'IA"
- [ ] Enter "iPhone 16 Pro" + "Apple" → click Générer
- [ ] Verify preview shows name, price, variants table, images thumbnails
- [ ] Click "← Modifier" → verify returns to form
- [ ] Click Confirmer → verify redirect to /products/[id]/edit with pre-filled fields
- [ ] Verify variants are visible in the Variantes section
- [ ] Verify images appear in the Images section
- [ ] Test with a product that has no variants (e.g. "Câble USB-C")
- [ ] Test auth: verify customer cannot call the actions (requires admin)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Notes

- **`is_draft=1`** : le produit est créé en brouillon. L'admin doit sauvegarder dans l'éditeur (`updateProduct`) pour le publier (ce qui passe `is_draft` à 0).
- **Images** : les URLs externes sont affichées directement dans le modal pour la preview (avant upload R2). Si une image échoue au téléchargement, elle est silencieusement ignorée.
- **Slug** : générée automatiquement via `slugify(name)`. En cas de collision, l'admin peut la modifier dans l'éditeur.
- **Brave Image API** : utilise le même `BRAVE_SEARCH_API_KEY` que la recherche de specs. Si non disponible, le modal fonctionne sans images.
