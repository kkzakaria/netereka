# Admin AI Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Workers AI-powered content generation (product text, banner text, category suggestions, banner images) to the NETEREKA admin panel via inline buttons in existing forms.

**Architecture:** Server Actions calling Workers AI models through the `env.AI` binding. A shared `lib/ai/` module holds the `getAI()` helper and prompt templates. A reusable `AiGenerateButton` client component provides the ✨ trigger across forms.

**Tech Stack:** Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`, `@cf/stabilityai/stable-diffusion-xl-base-1.0`), Zod (response validation), Sonner (toasts), nanoid (R2 keys)

**Design doc:** `docs/plans/2026-02-18-admin-ai-integration-design.md`

---

### Task 1: Workers AI binding + helper

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `env.d.ts`
- Create: `lib/ai/index.ts`

**Step 1: Add AI binding to wrangler.jsonc**

Add the `"ai"` key at the top level of the JSON object, after the `"images"` block:

```jsonc
  "images": {
    "binding": "IMAGES"
  },
  "ai": {
    "binding": "AI"
  }
```

**Step 2: Add AI type to env.d.ts**

Add `AI: Ai;` to the `CloudflareEnv` interface (after `IMAGES: ImagesBinding;`):

```typescript
interface CloudflareEnv {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  ASSETS: Fetcher;
  IMAGES: ImagesBinding;
  AI: Ai;
  // ... rest unchanged
}
```

The `Ai` type is globally provided by `@cloudflare/workers-types` (already installed).

**Step 3: Create lib/ai/index.ts**

```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct" as const;
export const IMAGE_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0" as const;

export async function getAI() {
  const { env } = await getCloudflareContext();
  return env.AI;
}
```

**Step 4: Commit**

```bash
git add wrangler.jsonc env.d.ts lib/ai/index.ts
git commit -m "feat(ai): add Workers AI binding and helper"
```

---

### Task 2: Prompt templates

**Files:**
- Create: `lib/ai/prompts.ts`

**Step 1: Create lib/ai/prompts.ts**

```typescript
export function productTextPrompt(input: {
  name: string;
  categoryName?: string;
  brand?: string;
}) {
  const context = [
    `Nom du produit: ${input.name}`,
    input.brand ? `Marque: ${input.brand}` : null,
    input.categoryName ? `Catégorie: ${input.categoryName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    system: `Tu es un rédacteur e-commerce spécialisé en électronique pour le marché ivoirien. Tu rédiges en français. Les prix sont en FCFA.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après. Le JSON doit avoir exactement ces clés :
- "description": description détaillée du produit (2-3 phrases, max 500 caractères)
- "shortDescription": résumé accrocheur en une phrase (max 150 caractères)
- "metaTitle": titre SEO optimisé (max 60 caractères)
- "metaDescription": description SEO (max 160 caractères)`,
    user: context,
  };
}

export function bannerTextPrompt(input: {
  productName?: string;
  promotion?: string;
  theme?: string;
}) {
  const context = [
    input.productName ? `Produit: ${input.productName}` : null,
    input.promotion ? `Promotion: ${input.promotion}` : null,
    input.theme ? `Thème: ${input.theme}` : null,
  ]
    .filter(Boolean)
    .join("\n") || "Bannière promotionnelle générale pour un site e-commerce d'électronique en Côte d'Ivoire";

  return {
    system: `Tu es un copywriter spécialisé en bannières promotionnelles e-commerce pour le marché ivoirien. Tu rédiges en français. Sois accrocheur et concis.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après. Le JSON doit avoir exactement ces clés :
- "title": titre principal de la bannière (max 50 caractères, percutant)
- "subtitle": sous-titre descriptif (max 100 caractères)
- "ctaText": texte du bouton d'action (max 20 caractères, ex: "Découvrir", "Profiter")
- "badgeText": texte du badge optionnel (max 20 caractères, ex: "Nouveau", "Promo -30%", ou "" si pas pertinent)`,
    user: context,
  };
}

export function categorySuggestionPrompt(input: {
  productName: string;
  description?: string;
  categories: Array<{ id: string; name: string; parentName?: string }>;
}) {
  const categoryList = input.categories
    .map(
      (c) =>
        `- id: "${c.id}", nom: "${c.parentName ? `${c.parentName} > ${c.name}` : c.name}"`
    )
    .join("\n");

  const context = [
    `Produit: ${input.productName}`,
    input.description ? `Description: ${input.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    system: `Tu es un expert en classification de produits électroniques. Tu dois classer un produit dans les catégories existantes d'un site e-commerce.

Voici les catégories disponibles :
${categoryList}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après. Le JSON doit avoir exactement cette clé :
- "suggestions": un tableau de 3 objets, chacun avec "categoryId" (string, doit être un id de la liste ci-dessus), "categoryName" (string), et "confidence" (number entre 0 et 1)

Classe les suggestions de la plus pertinente à la moins pertinente.`,
    user: context,
  };
}

export function bannerImagePrompt(input: {
  prompt: string;
  style?: "product" | "abstract" | "lifestyle";
}) {
  const styleGuide: Record<string, string> = {
    product: "Product showcase photography, clean background, professional lighting",
    abstract: "Abstract geometric shapes, modern gradients, tech-inspired patterns",
    lifestyle: "Lifestyle scene, people using technology, warm and inviting atmosphere",
  };

  const style = styleGuide[input.style ?? "abstract"];

  return `${input.prompt}, ${style}, e-commerce banner, high quality, 16:9 aspect ratio, navy blue and mint green color scheme`;
}
```

**Step 2: Commit**

```bash
git add lib/ai/prompts.ts
git commit -m "feat(ai): add prompt templates for all AI features"
```

---

### Task 3: Zod schemas for AI responses

**Files:**
- Create: `lib/ai/schemas.ts`

**Step 1: Create lib/ai/schemas.ts**

```typescript
import { z } from "zod/v4";

export const productTextSchema = z.object({
  description: z.string().max(500),
  shortDescription: z.string().max(150),
  metaTitle: z.string().max(60),
  metaDescription: z.string().max(160),
});

export type ProductTextResult = z.infer<typeof productTextSchema>;

export const bannerTextSchema = z.object({
  title: z.string().max(200),
  subtitle: z.string().max(500),
  ctaText: z.string().max(50),
  badgeText: z.string().max(50).optional().default(""),
});

export type BannerTextResult = z.infer<typeof bannerTextSchema>;

export const categorySuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      categoryId: z.string(),
      categoryName: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ).min(1).max(3),
});

export type CategorySuggestionResult = z.infer<typeof categorySuggestionSchema>;
```

Note: Check the project's Zod version — if Zod v4, import from `"zod/v4"`. If Zod v3, import from `"zod"`. Inspect existing imports in `actions/admin/banners.ts` for the pattern used.

**Step 2: Commit**

```bash
git add lib/ai/schemas.ts
git commit -m "feat(ai): add Zod validation schemas for AI responses"
```

---

### Task 4: AI Server Actions — text generation

**Files:**
- Create: `actions/admin/ai.ts`
- Test: `__tests__/unit/actions/admin-ai.test.ts`

**Step 1: Write the failing tests**

Create `__tests__/unit/actions/admin-ai.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession, mockCustomerSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  aiRun: vi.fn(),
  getCategoryTree: vi.fn(),
  uploadToR2: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: vi.fn(),
  getKV: vi.fn(),
  getR2: vi.fn(),
}));
vi.mock("@/lib/ai", () => ({
  getAI: vi.fn().mockResolvedValue({ run: mocks.aiRun }),
  TEXT_MODEL: "@cf/meta/llama-3.1-8b-instruct",
  IMAGE_MODEL: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
}));
vi.mock("@/lib/db/categories", () => ({
  getCategoryTree: mocks.getCategoryTree,
}));
vi.mock("@/lib/storage/images", () => ({
  uploadToR2: mocks.uploadToR2,
}));
vi.mock("nanoid", () => ({ nanoid: vi.fn().mockReturnValue("mock-nano-id") }));

import { generateProductText, generateBannerText, suggestCategory } from "@/actions/admin/ai";

describe("generateProductText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("requires admin auth", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(generateProductText({ name: "iPhone 15" })).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns error when name is empty", async () => {
    const result = await generateProductText({ name: "" });
    expect(result.success).toBe(false);
  });

  it("returns generated text on valid LLM response", async () => {
    const llmResponse = {
      response: JSON.stringify({
        description: "Le dernier iPhone avec puce A17.",
        shortDescription: "iPhone 15 Pro Max - Performance ultime",
        metaTitle: "iPhone 15 Pro Max | NETEREKA",
        metaDescription: "Achetez le iPhone 15 Pro Max en Côte d'Ivoire.",
      }),
    };
    mocks.aiRun.mockResolvedValue(llmResponse);

    const result = await generateProductText({ name: "iPhone 15 Pro Max", brand: "Apple" });
    expect(result.success).toBe(true);
    expect(result.data?.description).toBe("Le dernier iPhone avec puce A17.");
    expect(mocks.aiRun).toHaveBeenCalledOnce();
  });

  it("retries once on malformed JSON and returns error if both fail", async () => {
    mocks.aiRun.mockResolvedValue({ response: "not valid json {{{" });

    const result = await generateProductText({ name: "Test Product" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("générer");
    expect(mocks.aiRun).toHaveBeenCalledTimes(2);
  });
});

describe("generateBannerText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("requires admin auth", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(generateBannerText({})).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns generated banner text", async () => {
    const llmResponse = {
      response: JSON.stringify({
        title: "Offre Flash !",
        subtitle: "Jusqu'à -40% sur les smartphones",
        ctaText: "En profiter",
        badgeText: "Promo",
      }),
    };
    mocks.aiRun.mockResolvedValue(llmResponse);

    const result = await generateBannerText({ theme: "soldes" });
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Offre Flash !");
  });
});

describe("suggestCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.getCategoryTree.mockResolvedValue([
      { id: "cat-1", name: "Smartphones", slug: "smartphones", parent_id: null, children: [
        { id: "cat-1a", name: "iPhone", slug: "iphone", parent_id: "cat-1", children: [] },
      ] },
      { id: "cat-2", name: "Ordinateurs", slug: "ordinateurs", parent_id: null, children: [] },
    ]);
  });

  it("requires admin auth", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(suggestCategory({ productName: "iPhone" })).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns category suggestions from existing categories", async () => {
    mocks.aiRun.mockResolvedValue({
      response: JSON.stringify({
        suggestions: [
          { categoryId: "cat-1a", categoryName: "iPhone", confidence: 0.95 },
          { categoryId: "cat-1", categoryName: "Smartphones", confidence: 0.8 },
          { categoryId: "cat-2", categoryName: "Ordinateurs", confidence: 0.1 },
        ],
      }),
    });

    const result = await suggestCategory({ productName: "iPhone 15 Pro Max" });
    expect(result.success).toBe(true);
    expect(result.data?.suggestions).toHaveLength(3);
    expect(result.data?.suggestions[0].categoryId).toBe("cat-1a");
  });

  it("filters out hallucinated category IDs", async () => {
    mocks.aiRun.mockResolvedValue({
      response: JSON.stringify({
        suggestions: [
          { categoryId: "fake-id", categoryName: "Fake", confidence: 0.9 },
          { categoryId: "cat-1", categoryName: "Smartphones", confidence: 0.7 },
        ],
      }),
    });

    const result = await suggestCategory({ productName: "iPhone 15" });
    expect(result.success).toBe(true);
    // "fake-id" should be filtered out
    expect(result.data?.suggestions.every(
      (s: { categoryId: string }) => ["cat-1", "cat-1a", "cat-2"].includes(s.categoryId)
    )).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/unit/actions/admin-ai.test.ts`
Expected: FAIL — module `@/actions/admin/ai` does not exist.

**Step 3: Write the Server Actions implementation**

Create `actions/admin/ai.ts`:

```typescript
"use server";

import { z } from "zod/v4";
import { requireAdmin } from "@/lib/auth/guards";
import { getAI, TEXT_MODEL } from "@/lib/ai";
import { productTextPrompt, bannerTextPrompt, categorySuggestionPrompt } from "@/lib/ai/prompts";
import { productTextSchema, bannerTextSchema, categorySuggestionSchema } from "@/lib/ai/schemas";
import type { ProductTextResult, BannerTextResult, CategorySuggestionResult } from "@/lib/ai/schemas";
import { getCategoryTree } from "@/lib/db/categories";
import type { CategoryNode } from "@/lib/db/types";

interface AiResult<T> {
  success: boolean;
  error?: string;
  data?: T;
}

const productTextInputSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  categoryName: z.string().optional(),
  brand: z.string().optional(),
});

const bannerTextInputSchema = z.object({
  productName: z.string().optional(),
  promotion: z.string().optional(),
  theme: z.string().optional(),
});

const suggestCategoryInputSchema = z.object({
  productName: z.string().min(1, "Le nom du produit est requis"),
  description: z.string().optional(),
});

async function runTextModel(
  system: string,
  user: string,
  retryCount = 0
): Promise<string> {
  const ai = await getAI();
  const result = await ai.run(TEXT_MODEL, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = (result as { response?: string }).response ?? "";

  // Try to extract JSON from the response (LLM may wrap in markdown code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    if (retryCount < 1) {
      return runTextModel(
        system + "\n\nIMPORTANT: Retourne UNIQUEMENT du JSON valide. Pas de texte, pas de markdown, juste l'objet JSON.",
        user,
        retryCount + 1
      );
    }
    throw new Error("Le modèle n'a pas retourné de JSON valide.");
  }

  return jsonMatch[0];
}

function flattenCategories(
  nodes: readonly CategoryNode[],
  parentName?: string
): Array<{ id: string; name: string; parentName?: string }> {
  const result: Array<{ id: string; name: string; parentName?: string }> = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, parentName });
    if (node.children.length > 0) {
      result.push(...flattenCategories(node.children, node.name));
    }
  }
  return result;
}

export async function generateProductText(
  input: z.input<typeof productTextInputSchema>
): Promise<AiResult<ProductTextResult>> {
  await requireAdmin();

  const parsed = productTextInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Le nom du produit est requis." };
  }

  try {
    const prompt = productTextPrompt(parsed.data);
    const jsonStr = await runTextModel(prompt.system, prompt.user);
    const data = productTextSchema.parse(JSON.parse(jsonStr));
    return { success: true, data };
  } catch (error) {
    console.error("[admin/ai] generateProductText error:", error);
    if (error instanceof Error && error.message.includes("429")) {
      return { success: false, error: "Limite IA quotidienne atteinte. Réessayez demain." };
    }
    return { success: false, error: "Impossible de générer le texte. Réessayez." };
  }
}

export async function generateBannerText(
  input: z.input<typeof bannerTextInputSchema>
): Promise<AiResult<BannerTextResult>> {
  await requireAdmin();

  const parsed = bannerTextInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Données invalides." };
  }

  try {
    const prompt = bannerTextPrompt(parsed.data);
    const jsonStr = await runTextModel(prompt.system, prompt.user);
    const data = bannerTextSchema.parse(JSON.parse(jsonStr));
    return { success: true, data };
  } catch (error) {
    console.error("[admin/ai] generateBannerText error:", error);
    if (error instanceof Error && error.message.includes("429")) {
      return { success: false, error: "Limite IA quotidienne atteinte. Réessayez demain." };
    }
    return { success: false, error: "Impossible de générer le texte. Réessayez." };
  }
}

export async function suggestCategory(
  input: z.input<typeof suggestCategoryInputSchema>
): Promise<AiResult<CategorySuggestionResult>> {
  await requireAdmin();

  const parsed = suggestCategoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Le nom du produit est requis." };
  }

  try {
    const tree = await getCategoryTree();
    const categories = flattenCategories(tree);

    if (categories.length === 0) {
      return { success: false, error: "Aucune catégorie disponible." };
    }

    const validIds = new Set(categories.map((c) => c.id));
    const prompt = categorySuggestionPrompt({ ...parsed.data, categories });
    const jsonStr = await runTextModel(prompt.system, prompt.user);
    const raw = categorySuggestionSchema.parse(JSON.parse(jsonStr));

    // Filter out hallucinated category IDs
    const filtered = raw.suggestions.filter((s) => validIds.has(s.categoryId));

    return {
      success: true,
      data: { suggestions: filtered.length > 0 ? filtered : raw.suggestions.slice(0, 1) },
    };
  } catch (error) {
    console.error("[admin/ai] suggestCategory error:", error);
    if (error instanceof Error && error.message.includes("429")) {
      return { success: false, error: "Limite IA quotidienne atteinte. Réessayez demain." };
    }
    return { success: false, error: "Impossible de suggérer une catégorie. Réessayez." };
  }
}
```

Note: Check if Zod imports should be `from "zod"` or `from "zod/v4"` — match the pattern in `actions/admin/banners.ts` (line 6: `import { z } from "zod"`).

**Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/unit/actions/admin-ai.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add actions/admin/ai.ts "__tests__/unit/actions/admin-ai.test.ts"
git commit -m "feat(ai): add text generation and category suggestion server actions"
```

---

### Task 5: AI Server Action — image generation

**Files:**
- Modify: `actions/admin/ai.ts`
- Modify: `__tests__/unit/actions/admin-ai.test.ts`

**Step 1: Add image generation test to the test file**

Append to `__tests__/unit/actions/admin-ai.test.ts`:

```typescript
import { generateBannerImage } from "@/actions/admin/ai";

describe("generateBannerImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("requires admin auth", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(
      generateBannerImage({ prompt: "Tech banner" })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns error when prompt is empty", async () => {
    const result = await generateBannerImage({ prompt: "" });
    expect(result.success).toBe(false);
  });

  it("generates image, uploads to R2, and returns URL", async () => {
    const fakeImageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mocks.aiRun.mockResolvedValue(fakeImageData);
    mocks.uploadToR2.mockResolvedValue("banners/ai-mock-nano-id.png");

    const result = await generateBannerImage({
      prompt: "Modern tech banner with smartphones",
      style: "product",
    });

    expect(result.success).toBe(true);
    expect(result.data?.imageUrl).toBe("/images/banners/ai-mock-nano-id.png");
    expect(mocks.aiRun).toHaveBeenCalledOnce();
    expect(mocks.uploadToR2).toHaveBeenCalledOnce();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/actions/admin-ai.test.ts`
Expected: FAIL — `generateBannerImage` is not exported from `@/actions/admin/ai`.

**Step 3: Add generateBannerImage to actions/admin/ai.ts**

Add the following imports at the top of `actions/admin/ai.ts`:

```typescript
import { nanoid } from "nanoid";
import { getAI, TEXT_MODEL, IMAGE_MODEL } from "@/lib/ai";
import { uploadToR2 } from "@/lib/storage/images";
import { bannerImagePrompt } from "@/lib/ai/prompts";
```

Update the `IMAGE_MODEL` import (it was not imported initially). Then add the action:

```typescript
const bannerImageInputSchema = z.object({
  prompt: z.string().min(1, "Décrivez l'image souhaitée"),
  style: z.enum(["product", "abstract", "lifestyle"]).optional(),
});

export async function generateBannerImage(
  input: z.input<typeof bannerImageInputSchema>
): Promise<AiResult<{ imageUrl: string }>> {
  await requireAdmin();

  const parsed = bannerImageInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Décrivez l'image souhaitée." };
  }

  try {
    const ai = await getAI();
    const prompt = bannerImagePrompt(parsed.data);
    const imageData = await ai.run(IMAGE_MODEL, { prompt });

    // Workers AI returns a ReadableStream or Uint8Array for image models
    const buffer =
      imageData instanceof ReadableStream
        ? await new Response(imageData).arrayBuffer()
        : (imageData as ArrayBufferLike);

    const key = `banners/ai-${nanoid()}.png`;
    const file = new File([buffer], "generated.png", { type: "image/png" });
    await uploadToR2(file, key);

    return { success: true, data: { imageUrl: `/images/${key}` } };
  } catch (error) {
    console.error("[admin/ai] generateBannerImage error:", error);
    if (error instanceof Error && error.message.includes("429")) {
      return { success: false, error: "Limite IA quotidienne atteinte. Réessayez demain." };
    }
    return { success: false, error: "Impossible de générer l'image. Réessayez." };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/unit/actions/admin-ai.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add actions/admin/ai.ts "__tests__/unit/actions/admin-ai.test.ts"
git commit -m "feat(ai): add banner image generation server action"
```

---

### Task 6: AiGenerateButton component

**Files:**
- Create: `components/admin/ai-generate-button.tsx`

**Step 1: Create the reusable button component**

```typescript
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiMagicIcon } from "@hugeicons/core-free-icons";
import { Loader2 } from "lucide-react";

interface AiGenerateButtonProps<T> {
  onGenerate: () => Promise<{ success: boolean; error?: string; data?: T }>;
  onResult: (data: T) => void;
  label?: string;
  disabled?: string; // tooltip reason, undefined = enabled
  size?: "xs" | "sm" | "default";
}

export function AiGenerateButton<T>({
  onGenerate,
  onResult,
  label = "Générer avec l'IA",
  disabled,
  size = "sm",
}: AiGenerateButtonProps<T>) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      const result = await onGenerate();
      if (result.success && result.data) {
        onResult(result.data);
        toast.success("Contenu généré avec succès");
      } else {
        toast.error(result.error || "Erreur lors de la génération");
      }
    } catch {
      toast.error("Erreur de connexion. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handleClick}
      disabled={isLoading || !!disabled}
      title={disabled || label}
      className="gap-1.5"
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <HugeiconsIcon icon={AiMagicIcon} size={16} />
      )}
      <span className="hidden sm:inline">{isLoading ? "Génération..." : label}</span>
    </Button>
  );
}
```

Note: Check if `AiMagicIcon` exists in `@hugeicons/core-free-icons`. If not, search for alternatives: `AiInnovation01Icon`, `MagicWand01Icon`, `SparklesIcon`, or use `Sparkles` from `lucide-react` as fallback. Run `grep -r "Magic" node_modules/@hugeicons/core-free-icons/dist/` to check, or just try the import and see if TypeScript complains.

If `lucide-react` is not installed, use a simple SVG sparkle icon or another available HugeIcon.

**Step 2: Commit**

```bash
git add components/admin/ai-generate-button.tsx
git commit -m "feat(ai): add reusable AiGenerateButton component"
```

---

### Task 7: Integrate AI into product form

**Files:**
- Modify: `components/admin/product-form-sections.tsx`

This task modifies the existing product form to add 3 AI buttons:
1. ✨ "Générer les textes" in the Informations section header
2. ✨ "Générer SEO" in the SEO section header
3. ✨ "Suggérer" in the Catégorie section header

**Step 1: Add imports at the top of product-form-sections.tsx**

Add after existing imports:

```typescript
import { AiGenerateButton } from "./ai-generate-button";
import { generateProductText, suggestCategory } from "@/actions/admin/ai";
import type { ProductTextResult, CategorySuggestionResult } from "@/lib/ai/schemas";
```

**Step 2: Add AI state + refs for programmatic field updates**

The form uses uncontrolled inputs with `defaultValue`. To programmatically update field values after AI generation, we need refs for the fields that AI can fill.

Add refs inside `ProductFormSections` component after existing refs:

```typescript
const descriptionRef = useRef<HTMLTextAreaElement>(null);
const shortDescriptionRef = useRef<HTMLInputElement>(null);
const metaTitleRef = useRef<HTMLInputElement>(null);
const metaDescriptionRef = useRef<HTMLTextAreaElement>(null);
const [categorySuggestions, setCategorySuggestions] = useState<
  CategorySuggestionResult["suggestions"]
>([]);
```

Add `useState` to the existing React import.

**Step 3: Add ref attributes to the target input/textarea elements**

For each field that AI can fill, add the `ref` attribute:
- `short_description` Input → add `ref={shortDescriptionRef}`
- `description` Textarea → add `ref={descriptionRef}`
- `meta_title` Input → add `ref={metaTitleRef}`
- `meta_description` Textarea → add `ref={metaDescriptionRef}`

**Step 4: Add ✨ button in Informations section header**

Replace the Informations section `CardHeader`:

```tsx
<CardHeader className="flex-row items-center justify-between space-y-0">
  <CardTitle>Informations générales</CardTitle>
  <AiGenerateButton<ProductTextResult>
    label="Générer les textes"
    disabled={undefined}
    onGenerate={() => {
      const name = (document.getElementById("name") as HTMLInputElement)?.value;
      if (!name) return Promise.resolve({ success: false, error: "Entrez d'abord le nom du produit" });
      const brand = (document.getElementById("brand") as HTMLInputElement)?.value;
      return generateProductText({ name, brand });
    }}
    onResult={(data) => {
      if (descriptionRef.current) descriptionRef.current.value = data.description;
      if (shortDescriptionRef.current) shortDescriptionRef.current.value = data.shortDescription;
    }}
  />
</CardHeader>
```

**Step 5: Add ✨ button in SEO section header**

Replace the SEO section `CardHeader`:

```tsx
<CardHeader className="flex-row items-center justify-between space-y-0">
  <CardTitle>SEO</CardTitle>
  <AiGenerateButton<ProductTextResult>
    label="Générer SEO"
    onGenerate={() => {
      const name = (document.getElementById("name") as HTMLInputElement)?.value;
      if (!name) return Promise.resolve({ success: false, error: "Entrez d'abord le nom du produit" });
      const brand = (document.getElementById("brand") as HTMLInputElement)?.value;
      return generateProductText({ name, brand });
    }}
    onResult={(data) => {
      if (metaTitleRef.current) metaTitleRef.current.value = data.metaTitle;
      if (metaDescriptionRef.current) metaDescriptionRef.current.value = data.metaDescription;
    }}
  />
</CardHeader>
```

**Step 6: Add ✨ button + suggestion chips in Catégorie section**

Replace the Catégorie section:

```tsx
<Card id="section-category">
  <CardHeader className="flex-row items-center justify-between space-y-0">
    <CardTitle>Catégorie</CardTitle>
    <AiGenerateButton<CategorySuggestionResult>
      label="Suggérer"
      onGenerate={() => {
        const name = (document.getElementById("name") as HTMLInputElement)?.value;
        if (!name) return Promise.resolve({ success: false, error: "Entrez d'abord le nom du produit" });
        const desc = descriptionRef.current?.value;
        return suggestCategory({ productName: name, description: desc });
      }}
      onResult={(data) => {
        setCategorySuggestions(data.suggestions);
      }}
    />
  </CardHeader>
  <CardContent className="space-y-4">
    <CategoryCascadingSelect
      categories={categories}
      defaultCategoryId={product.category_id || undefined}
    />
    {categorySuggestions.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {categorySuggestions.map((s) => (
          <button
            key={s.categoryId}
            type="button"
            className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
            onClick={() => {
              // Dispatch a custom event that CategoryCascadingSelect listens to
              window.dispatchEvent(
                new CustomEvent("ai-category-select", { detail: { categoryId: s.categoryId } })
              );
              setCategorySuggestions([]);
            }}
          >
            {s.categoryName} ({Math.round(s.confidence * 100)}%)
          </button>
        ))}
      </div>
    )}
  </CardContent>
</Card>
```

**Step 7: Update CategoryCascadingSelect to listen for ai-category-select events**

Modify `components/admin/category-cascading-select.tsx`. Add a `useEffect` that listens for the custom event:

```typescript
import { useEffect, useMemo, useState } from "react";

// Inside the component, after existing state:
useEffect(() => {
  function handleAiSelect(e: Event) {
    const { categoryId } = (e as CustomEvent).detail;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    if (cat.depth === 0) {
      setParentId(cat.id);
      setSubcategoryId("");
    } else if (cat.parent_id) {
      setParentId(cat.parent_id);
      setSubcategoryId(cat.id);
    }
  }
  window.addEventListener("ai-category-select", handleAiSelect);
  return () => window.removeEventListener("ai-category-select", handleAiSelect);
}, [categories]);
```

**Step 8: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 9: Commit**

```bash
git add components/admin/product-form-sections.tsx components/admin/category-cascading-select.tsx
git commit -m "feat(ai): integrate AI generation buttons into product form"
```

---

### Task 8: Integrate AI into banner form

**Files:**
- Modify: `components/admin/banner-form.tsx`
- Create: `components/admin/ai-image-dialog.tsx`

**Step 1: Create the AI image generation dialog**

Create `components/admin/ai-image-dialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiMagicIcon } from "@hugeicons/core-free-icons";
import { Loader2 } from "lucide-react";
import { generateBannerImage } from "@/actions/admin/ai";
import { getImageUrl } from "@/lib/utils/images";

interface AiImageDialogProps {
  onImageGenerated: (imageUrl: string) => void;
}

export function AiImageDialog({ onImageGenerated }: AiImageDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<"product" | "abstract" | "lifestyle">("abstract");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Décrivez l'image souhaitée");
      return;
    }
    setIsLoading(true);
    setPreviewUrl(null);
    try {
      const result = await generateBannerImage({ prompt, style });
      if (result.success && result.data) {
        setPreviewUrl(result.data.imageUrl);
      } else {
        toast.error(result.error || "Erreur lors de la génération");
      }
    } catch {
      toast.error("Erreur de connexion. Réessayez.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleUseImage() {
    if (previewUrl) {
      onImageGenerated(previewUrl);
      setOpen(false);
      setPreviewUrl(null);
      setPrompt("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <HugeiconsIcon icon={AiMagicIcon} size={16} />
          <span>Générer une image</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Générer une image de bannière</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-image-prompt">Description de l&apos;image</Label>
            <Input
              id="ai-image-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Smartphones modernes sur fond technologique"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-image-style">Style</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as typeof style)}>
              <SelectTrigger id="ai-image-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Produit</SelectItem>
                <SelectItem value="abstract">Abstrait</SelectItem>
                <SelectItem value="lifestyle">Lifestyle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {previewUrl && (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border">
              <Image
                src={getImageUrl(previewUrl)}
                alt="Image générée par IA"
                fill
                className="object-contain"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Génération...
                </>
              ) : previewUrl ? (
                "Régénérer"
              ) : (
                "Générer"
              )}
            </Button>
            {previewUrl && (
              <Button type="button" variant="outline" onClick={handleUseImage} className="flex-1">
                Utiliser cette image
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Note: Same HugeIcons caveat as Task 6 — verify `AiMagicIcon` exists or use alternative. Also verify `Dialog` from shadcn is available at `@/components/ui/dialog`. If not, scaffold it first: `npx shadcn@latest add dialog`.

**Step 2: Add AI buttons to banner-form.tsx**

Add imports at top of `banner-form.tsx`:

```typescript
import { AiGenerateButton } from "./ai-generate-button";
import { AiImageDialog } from "./ai-image-dialog";
import { generateBannerText } from "@/actions/admin/ai";
import type { BannerTextResult } from "@/lib/ai/schemas";
```

Add refs for banner text fields:

```typescript
const titleRef = useRef<HTMLInputElement>(null);
const subtitleRef = useRef<HTMLTextAreaElement>(null);
const ctaTextRef = useRef<HTMLInputElement>(null);
const badgeTextRef = useRef<HTMLInputElement>(null);
```

Replace the Informations `CardHeader`:

```tsx
<CardHeader className="flex-row items-center justify-between space-y-0">
  <CardTitle>Informations</CardTitle>
  <AiGenerateButton<BannerTextResult>
    label="Générer les textes"
    onGenerate={() => generateBannerText({})}
    onResult={(data) => {
      if (titleRef.current) titleRef.current.value = data.title;
      if (subtitleRef.current) subtitleRef.current.value = data.subtitle;
      if (ctaTextRef.current) ctaTextRef.current.value = data.ctaText;
      if (badgeTextRef.current) badgeTextRef.current.value = data.badgeText ?? "";
    }}
  />
</CardHeader>
```

Add `ref` attributes to the target inputs: `title` → `ref={titleRef}`, `subtitle` → `ref={subtitleRef}`, `cta_text` → `ref={ctaTextRef}`, `badge_text` → `ref={badgeTextRef}`.

Add the AI image dialog in the Image card, next to the existing upload button (in edit mode):

```tsx
<div className="flex gap-2">
  <Button type="button" variant="outline" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
    {imagePreview ? "Changer l'image" : "Ajouter une image"}
  </Button>
  {isEdit && (
    <AiImageDialog
      onImageGenerated={(url) => {
        setImagePreview(url);
        toast.success("Image IA appliquée");
      }}
    />
  )}
</div>
```

Note: The AI image dialog generates and uploads to R2 independently. The URL stored in state needs to also be saved to the banner DB record. This happens either via `uploadBannerImage` or by adding the URL to the form's hidden field. The simplest approach: after AI generates the image (already uploaded to R2), we call `uploadBannerImage` with the generated URL data. However, `uploadBannerImage` expects a File. A simpler approach: add a new action `setBannerImageUrl(bannerId, url)` that just updates the DB record. Or, since the image is already on R2, update `banner-form.tsx` to include a hidden `image_url` field in the form submit. Review the form flow and pick the simplest path.

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add components/admin/ai-image-dialog.tsx components/admin/banner-form.tsx
git commit -m "feat(ai): integrate AI generation into banner form"
```

---

### Task 9: Full integration test + type check

**Files:** None created — verification only.

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS.

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Run linter**

Run: `npm run lint`
Expected: No errors.

**Step 4: Start dev server and verify visually (manual)**

Run: `npm run dev`

Verify:
1. Navigate to `/products/new` → see ✨ buttons in Informations, SEO, and Catégorie sections
2. Navigate to `/banners/new` → see ✨ button in Informations section
3. Navigate to `/banners/{id}/edit` → see ✨ "Générer une image" button in Image section

Note: Actual AI generation won't work in local dev unless Workers AI binding is available locally (requires `wrangler dev` or deployed environment). The buttons should render and the click handlers should fire, but expect a "Service IA temporairement indisponible" error in local `next dev`.

**Step 5: Commit any fixes if needed, then create PR**

Create branch and PR:

```bash
git checkout -b feat/admin-ai-integration
git push -u origin feat/admin-ai-integration
gh pr create --title "feat: add AI-assisted content generation in admin" --body "..."
```
