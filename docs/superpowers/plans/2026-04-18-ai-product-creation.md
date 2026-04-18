# AI-Powered Product Creation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-assisted path for creating products from a short text prompt. Claude researches the product online, suggests images, and pre-fills the existing 5-step wizard so the admin only has to validate and set the local XOF price.

**Architecture:**
- A new Route Handler streams progress events while Claude runs web search + a custom `submit_product` tool to produce a strictly-validated JSON payload.
- A dedicated `/products/ai-new` client page walks through three states (prompt → progress → image selection) then calls a Server Action that downloads the selected images to R2 and hydrates a draft product.
- The existing 5-step `ProductWizard` at `/products/{id}/edit` opens pre-filled; the admin fills price + stock there.

**Tech Stack:** Next.js 16 App Router, TypeScript, `@anthropic-ai/sdk` (new), Cloudflare Workers (D1, KV, R2) via OpenNext, Vitest, Zod, React Hook Form patterns already in use, shadcn/ui.

**Spec:** [docs/superpowers/specs/2026-04-18-ai-product-creation-design.md](../specs/2026-04-18-ai-product-creation-design.md)

---

## File Structure

### Created

| Path | Responsibility |
| --- | --- |
| `lib/ai/client.ts` | Anthropic SDK singleton. Reads `ANTHROPIC_API_KEY` from `getCloudflareContext().env`. Exposes `getAnthropicClient()`. Nothing else. |
| `lib/ai/rate-limit.ts` | KV-backed fixed-window counter (1h, 10 calls) keyed by `ai_gen:{adminId}`. Exposes `checkRateLimit(adminId)` returning `{ ok: true } \| { ok: false, retryAfterSec }`. |
| `lib/ai/product-research.ts` | Pure function `researchProduct(prompt, anthropic)`. Wraps `anthropic.messages.stream(...)` with `web_search_20250305` + custom `submit_product` tool; returns an async iterator of progress events then a terminal `done`/`not_found`/`error` event. Knows nothing about DB/R2. |
| `lib/ai/image-fetch.ts` | Given a URL + `draftId`, resolves host (rejects SSRF ranges), fetches with 10s timeout, enforces content-type whitelist + 5MB max, uploads to R2 via existing `uploadToR2()`. Returns `{ ok, key } \| { ok: false, reason }`. |
| `lib/validations/product-ai.ts` | Zod schemas: `aiPromptSchema`, `aiProductOutputSchema`, `aiNotFoundSchema`, helper `parseAiToolInput(raw)` returning a discriminated union. Re-uses `HIGHLIGHT_ICON_NAMES` from `product-story.ts`. |
| `app/api/admin/products-ai/generate/route.ts` | `POST` Route Handler. Auth + rate-limit + feature flag + prompt validation, then streams NDJSON events from `researchProduct`. |
| `actions/admin/products-ai.ts` | Server action `importCandidateImages(aiOutput, selectedUrls[])`. Validates selection is a subset of `aiOutput.image_candidates`, creates draft, downloads images in parallel, writes attributes + products update in a single D1 batch. Returns `{ success, id, warnings }`. |
| `app/(admin)/products/ai-new/page.tsx` | Server component. `requireAdmin()` + feature-flag gate (404 when disabled). Renders `<AiNewClient />`. |
| `app/(admin)/products/ai-new/ai-new-client.tsx` | Client component: state machine (`prompt \| generating \| selecting \| importing`), calls the Route Handler, consumes the NDJSON stream, calls the import server action on confirm. |
| `components/admin/ai-product/ai-prompt-form.tsx` | Prompt input + example chips. Disabled state during generation. |
| `components/admin/ai-product/ai-progress-panel.tsx` | Status-line checklist driven by received progress events. |
| `components/admin/ai-product/ai-image-selector.tsx` | Grid of candidate thumbnails, checkboxes, min/max selection enforced, source-domain caption. |
| `__tests__/unit/ai/rate-limit.test.ts` | Fixed-window logic, per-admin bucket isolation. |
| `__tests__/unit/ai/product-research.test.ts` | Streaming → progress event mapping, schema validation, retries, not-found. |
| `__tests__/unit/ai/image-fetch.test.ts` | SSRF, size, content-type, timeout, happy path. |
| `__tests__/unit/ai/prompt-validation.test.ts` | Zod: length bounds, control-char rejection. |
| `__tests__/unit/actions/products-ai.test.ts` | Server action: guard, selection whitelisting, happy path, partial image failure. |

### Modified

| Path | Reason |
| --- | --- |
| `env.d.ts` | Add `ANTHROPIC_API_KEY: string;` and `AI_PRODUCT_CREATION_ENABLED?: string;` to `CloudflareEnv`. |
| `app/(admin)/products/products-page-client.tsx` | Add a `"✨ Créer avec l'IA"` `<Link>` next to the existing `"Nouveau"` button (mobile). |
| `app/(admin)/products/products-page-client.tsx` (or wherever `ProductsPageActions` lives — look in the same file; if it's defined in `app/(admin)/products/page.tsx` as a barrel export, modify there) | Add the same button to the desktop actions. Fine-grained path resolved in Task 9. |
| `package.json` | Add `@anthropic-ai/sdk` dependency. |

No migration required. Existing `createDraftProduct()`, `applyDraftUpdate()`, `product_attributes`, and `product_images` are sufficient.

---

## Task 1 — Add environment types and dependency

**Files:**
- Modify: `env.d.ts`
- Modify: `package.json` (add `@anthropic-ai/sdk`)

- [ ] **Step 1: Update `env.d.ts`**

Replace the closing brace of `CloudflareEnv` with:

```ts
  // Email (Resend)
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string; // defaults to "NETEREKA <commandes@netereka.ci>"

  // AI-powered product creation
  ANTHROPIC_API_KEY: string;
  // "0" disables the feature (button hidden, /products/ai-new returns 404). Any other value or unset = enabled.
  AI_PRODUCT_CREATION_ENABLED?: string;
}
```

- [ ] **Step 2: Install the Anthropic SDK**

Run:

```bash
npm install @anthropic-ai/sdk@^0.33.0
```

Expected: `package.json` and `package-lock.json` updated, `node_modules/@anthropic-ai/sdk` present.

- [ ] **Step 3: Verify TypeScript still compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: exits with code 0 and prints nothing.

- [ ] **Step 4: Commit**

```bash
git add env.d.ts package.json package-lock.json
git commit -m "chore(admin): add @anthropic-ai/sdk and AI env vars"
```

---

## Task 2 — Anthropic client singleton

**Files:**
- Create: `lib/ai/client.ts`
- Test: (none — thin wrapper; covered transitively by product-research tests)

- [ ] **Step 1: Create the singleton**

Write:

```ts
// lib/ai/client.ts
import Anthropic from "@anthropic-ai/sdk";
import { getCloudflareContext } from "@opennextjs/cloudflare";

let cached: Anthropic | null = null;

export async function getAnthropicClient(): Promise<Anthropic> {
  if (cached) return cached;
  const { env } = await getCloudflareContext({ async: true });
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  cached = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cached;
}

export function isAiFeatureEnabled(env: CloudflareEnv): boolean {
  return env.AI_PRODUCT_CREATION_ENABLED !== "0";
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: 0.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/client.ts
git commit -m "feat(admin): add Anthropic client singleton and feature flag helper"
```

---

## Task 3 — Prompt validation (Zod)

**Files:**
- Create: `lib/validations/product-ai.ts` (minimal version — prompt only; expanded in Task 5)
- Test: `__tests__/unit/ai/prompt-validation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/ai/prompt-validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aiPromptSchema } from "@/lib/validations/product-ai";

describe("aiPromptSchema", () => {
  it("accepte un prompt normal", () => {
    expect(aiPromptSchema.safeParse("Samsung Galaxy A55").success).toBe(true);
  });

  it("trim les espaces", () => {
    const r = aiPromptSchema.safeParse("  iPhone 15 Pro  ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("iPhone 15 Pro");
  });

  it("rejette trop court (< 3 chars après trim)", () => {
    expect(aiPromptSchema.safeParse("  a ").success).toBe(false);
  });

  it("rejette trop long (> 200 chars)", () => {
    expect(aiPromptSchema.safeParse("x".repeat(201)).success).toBe(false);
  });

  it("rejette les caractères de contrôle", () => {
    expect(aiPromptSchema.safeParse("Galaxy\x00A55").success).toBe(false);
    expect(aiPromptSchema.safeParse("Galaxy\nA55").success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
npx vitest run __tests__/unit/ai/prompt-validation.test.ts
```

Expected: FAIL — module `@/lib/validations/product-ai` not found.

- [ ] **Step 3: Implement the schema**

Create `lib/validations/product-ai.ts`:

```ts
import { z } from "zod";

/**
 * Admin-typed prompt for AI product generation.
 * Trim → reject control chars → length bounds. 3–200 chars feels natural
 * for product names (brand + model + capacity).
 */
export const aiPromptSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => !/[\u0000-\u001F\u007F]/.test(v), {
    message: "Caractères de contrôle interdits",
  })
  .refine((v) => v.length >= 3, { message: "Prompt trop court (min 3 caractères)" })
  .refine((v) => v.length <= 200, { message: "Prompt trop long (max 200 caractères)" });
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run __tests__/unit/ai/prompt-validation.test.ts
```

Expected: PASS × 5.

- [ ] **Step 5: Commit**

```bash
git add lib/validations/product-ai.ts __tests__/unit/ai/prompt-validation.test.ts
git commit -m "feat(admin): add AI prompt Zod schema with tests"
```

---

## Task 4 — Rate limit (KV-backed, per-admin)

**Files:**
- Create: `lib/ai/rate-limit.ts`
- Test: `__tests__/unit/ai/rate-limit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/ai/rate-limit.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const getKVMock = vi.fn();
vi.mock("@/lib/cloudflare/context", () => ({ getKV: () => getKVMock() }));

import { checkRateLimit, AI_GEN_MAX_PER_HOUR } from "@/lib/ai/rate-limit";

function makeKV(initial: Map<string, string> = new Map()) {
  const store = new Map(initial);
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    _store: store,
  };
}

describe("checkRateLimit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("autorise la première génération", async () => {
    const kv = makeKV();
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1");

    expect(r.ok).toBe(true);
    expect(kv.put).toHaveBeenCalledWith("ai_gen:admin-1", "1", expect.objectContaining({ expirationTtl: 3600 }));
  });

  it(`autorise jusqu'à ${AI_GEN_MAX_PER_HOUR} générations`, async () => {
    const kv = makeKV(new Map([["ai_gen:admin-1", String(AI_GEN_MAX_PER_HOUR - 1)]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1");
    expect(r.ok).toBe(true);
  });

  it(`rejette la ${AI_GEN_MAX_PER_HOUR + 1}ème génération`, async () => {
    const kv = makeKV(new Map([["ai_gen:admin-1", String(AI_GEN_MAX_PER_HOUR)]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("isole les buckets par admin", async () => {
    const kv = makeKV(new Map([["ai_gen:admin-1", String(AI_GEN_MAX_PER_HOUR)]]));
    getKVMock.mockResolvedValue(kv);

    const r = await checkRateLimit("admin-2");
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
npx vitest run __tests__/unit/ai/rate-limit.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the rate limit**

Create `lib/ai/rate-limit.ts`:

```ts
import { getKV } from "@/lib/cloudflare/context";

export const AI_GEN_MAX_PER_HOUR = 10;
const WINDOW_SEC = 3600;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Fixed 1-hour window, per-admin. Not exactly fair (bursts at window edges)
 * but trivial to implement on KV and sufficient as a cost ceiling.
 */
export async function checkRateLimit(adminId: string): Promise<RateLimitResult> {
  const kv = await getKV();
  if (!kv) throw new Error("KV namespace unavailable");

  const key = `ai_gen:${adminId}`;
  const current = await kv.get(key);
  const count = current ? Number(current) : 0;

  if (count >= AI_GEN_MAX_PER_HOUR) {
    return { ok: false, retryAfterSec: WINDOW_SEC };
  }

  await kv.put(key, String(count + 1), { expirationTtl: WINDOW_SEC });
  return { ok: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run __tests__/unit/ai/rate-limit.test.ts
```

Expected: PASS × 4.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/rate-limit.ts __tests__/unit/ai/rate-limit.test.ts
git commit -m "feat(admin): add per-admin KV rate limit for AI generation"
```

---

## Task 5 — AI output Zod schema (full)

**Files:**
- Modify: `lib/validations/product-ai.ts` (append output schemas)
- Test: `__tests__/unit/ai/prompt-validation.test.ts` (extend; rename not needed)

- [ ] **Step 1: Write the failing test (add `describe` block for output schema)**

Append to `__tests__/unit/ai/prompt-validation.test.ts`:

```ts
import { aiProductOutputSchema, aiNotFoundSchema, parseAiToolInput } from "@/lib/validations/product-ai";

describe("aiProductOutputSchema", () => {
  const valid = {
    name: "Samsung Galaxy A55",
    brand: "Samsung",
    category_suggestion: "smartphones",
    short_description: "Smartphone 128Go",
    description_html: "<p>Super téléphone.</p>",
    attributes: {
      colors: [{ name: "Noir", hex: "#1a1a1a" }],
      dimensions: { length_mm: 161, height_mm: 77, width_mm: 8, weight_g: 213 },
      specs: [{ name: "Écran", value: "6.6\" AMOLED 120Hz" }],
    },
    story: {
      tagline: "Le nouveau standard du milieu de gamme",
      highlights: [
        { icon: "camera", label: "Triple capteur 50MP" },
        { icon: "battery", label: "Autonomie 2 jours" },
        { icon: "display", label: "Écran 120Hz" },
      ],
      feature_blocks: [
        { title: "Un écran qui impressionne", body: "AMOLED 120Hz, 6.6 pouces." },
        { title: "Une autonomie tenace", body: "Batterie 5000 mAh, charge rapide 25W." },
      ],
      faq: [
        { question: "Est-il compatible 5G ?", answer: "Oui, pleinement compatible." },
      ],
    },
    seo: {
      meta_title: "Samsung Galaxy A55 5G 128Go | Netereka",
      meta_description: "Achetez le Galaxy A55 5G 128Go avec livraison à domicile.",
    },
    image_candidates: [
      { url: "https://images.samsung.com/a.jpg", source_domain: "samsung.com", alt: "Face avant" },
    ],
  };

  it("accepte une sortie complète valide", () => {
    expect(aiProductOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette un hex invalide", () => {
    const bad = { ...valid, attributes: { ...valid.attributes, colors: [{ name: "Noir", hex: "black" }] } };
    expect(aiProductOutputSchema.safeParse(bad).success).toBe(false);
  });

  it("rejette une URL d'image invalide", () => {
    const bad = { ...valid, image_candidates: [{ url: "not-a-url", source_domain: "x", alt: "" }] };
    expect(aiProductOutputSchema.safeParse(bad).success).toBe(false);
  });

  it("rejette un icône de highlight hors liste curée", () => {
    const bad = {
      ...valid,
      story: { ...valid.story, highlights: [
        { icon: "invalid-icon", label: "x" },
        { icon: "camera", label: "y" },
        { icon: "battery", label: "z" },
      ] },
    };
    expect(aiProductOutputSchema.safeParse(bad).success).toBe(false);
  });
});

describe("parseAiToolInput", () => {
  it("retourne une erreur when not_found flag true", () => {
    const r = parseAiToolInput({ not_found: true, reason: "Produit inconnu" });
    expect(r.kind).toBe("not_found");
  });

  it("retourne ok pour une sortie complète", () => {
    const out = {
      name: "X", category_suggestion: "y",
      attributes: { colors: [], dimensions: {}, specs: [] },
      story: {},
      seo: {},
      image_candidates: [{ url: "https://x.test/a.jpg", source_domain: "x.test" }],
    };
    const r = parseAiToolInput(out);
    expect(r.kind).toBe("ok");
  });

  it("retourne invalid pour un payload cassé", () => {
    const r = parseAiToolInput({ oops: true });
    expect(r.kind).toBe("invalid");
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

Run:

```bash
npx vitest run __tests__/unit/ai/prompt-validation.test.ts
```

Expected: FAIL on the new describe blocks — symbols not exported.

- [ ] **Step 3: Extend `lib/validations/product-ai.ts`**

Append to `lib/validations/product-ai.ts`:

```ts
import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide (format #rrggbb)");

const colorSchema = z.object({
  name: z.string().trim().min(1).max(40),
  hex: hexColor,
});

const dimensionsSchema = z.object({
  length_mm: z.number().int().positive().optional(),
  height_mm: z.number().int().positive().optional(),
  width_mm:  z.number().int().positive().optional(),
  weight_g:  z.number().int().positive().optional(),
});

const specSchema = z.object({
  name:  z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
});

// Icon list reused from product-story — keeps the UI and AI in lockstep.
const highlightSchema = z.object({
  icon: z.enum(HIGHLIGHT_ICON_NAMES),
  label: z.string().trim().min(1).max(80),
});

const featureBlockSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body:  z.string().trim().min(1).max(600),
});

const faqSchema = z.object({
  question: z.string().trim().min(1).max(160),
  answer:   z.string().trim().min(1).max(600),
});

export const aiProductOutputSchema = z.object({
  name: z.string().trim().min(1).max(150),
  brand: z.string().trim().max(80).optional(),
  category_suggestion: z.string().trim().min(1),
  short_description: z.string().trim().max(120).optional(),
  description_html: z.string().optional(),
  attributes: z.object({
    colors: z.array(colorSchema).max(12).default([]),
    dimensions: dimensionsSchema.default({}),
    specs: z.array(specSchema).max(20).default([]),
  }).default({ colors: [], dimensions: {}, specs: [] }),
  story: z.object({
    tagline: z.string().trim().max(200).optional(),
    highlights: z.array(highlightSchema).min(3).max(6).optional(),
    feature_blocks: z.array(featureBlockSchema).min(2).max(4).optional(),
    faq: z.array(faqSchema).max(5).optional(),
  }).default({}),
  seo: z.object({
    meta_title: z.string().trim().max(60).optional(),
    meta_description: z.string().trim().max(160).optional(),
  }).default({}),
  image_candidates: z.array(z.object({
    url: z.string().url(),
    source_domain: z.string().min(1),
    alt: z.string().max(200).optional(),
  })).min(1).max(12),
});

export const aiNotFoundSchema = z.object({
  not_found: z.literal(true),
  reason: z.string().max(300),
});

export type AiProductOutput = z.infer<typeof aiProductOutputSchema>;

export type AiToolInputResult =
  | { kind: "ok"; output: AiProductOutput }
  | { kind: "not_found"; reason: string }
  | { kind: "invalid"; issues: z.ZodIssue[] };

/** Try not-found first — it has a discriminating literal — then the full schema. */
export function parseAiToolInput(raw: unknown): AiToolInputResult {
  const nf = aiNotFoundSchema.safeParse(raw);
  if (nf.success) return { kind: "not_found", reason: nf.data.reason };

  const ok = aiProductOutputSchema.safeParse(raw);
  if (ok.success) return { kind: "ok", output: ok.data };
  return { kind: "invalid", issues: ok.error.issues };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run __tests__/unit/ai/prompt-validation.test.ts
```

Expected: PASS — all (5 prompt tests + new output tests).

- [ ] **Step 5: Commit**

```bash
git add lib/validations/product-ai.ts __tests__/unit/ai/prompt-validation.test.ts
git commit -m "feat(admin): add AI product output Zod schema (reuses story icons)"
```

---

## Task 6 — Image fetch with SSRF / size / content-type guards

**Files:**
- Create: `lib/ai/image-fetch.ts`
- Test: `__tests__/unit/ai/image-fetch.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/ai/image-fetch.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const uploadToR2Mock = vi.fn();
vi.mock("@/lib/storage/images", () => ({ uploadToR2: uploadToR2Mock }));

import { fetchAndUploadImage, IMAGE_MAX_BYTES } from "@/lib/ai/image-fetch";

function makeImageResponse(opts: {
  ok?: boolean;
  status?: number;
  contentType?: string;
  body?: Uint8Array;
} = {}) {
  const body = opts.body ?? new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header-ish
  return new Response(body, {
    status: opts.status ?? 200,
    headers: { "content-type": opts.contentType ?? "image/png" },
  });
}

describe("fetchAndUploadImage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejette URL localhost (SSRF)", async () => {
    const r = await fetchAndUploadImage("draft-1", "http://127.0.0.1/x.png");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ssrf");
  });

  it("rejette les IPs privées RFC1918", async () => {
    const r = await fetchAndUploadImage("draft-1", "http://10.0.0.1/x.png");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ssrf");
  });

  it("rejette les schemas non-http", async () => {
    const r = await fetchAndUploadImage("draft-1", "file:///etc/passwd");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ssrf");
  });

  it("rejette les content-types non-image", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      makeImageResponse({ contentType: "text/html" }),
    ));
    const r = await fetchAndUploadImage("draft-1", "https://example.test/x.png");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_content_type");
  });

  it("rejette si body > 5 MB", async () => {
    const big = new Uint8Array(IMAGE_MAX_BYTES + 1);
    big[0] = 0x89; // dummy PNG-ish first byte
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeImageResponse({ body: big })));
    const r = await fetchAndUploadImage("draft-1", "https://example.test/big.png");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_large");
  });

  it("upload vers R2 pour une image valide", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeImageResponse()));
    uploadToR2Mock.mockResolvedValue("products/draft-1/abc.png");

    const r = await fetchAndUploadImage("draft-1", "https://example.test/a.png");

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.key).toMatch(/^products\/draft-1\/[A-Za-z0-9_-]+\.png$/);
    expect(uploadToR2Mock).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
npx vitest run __tests__/unit/ai/image-fetch.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/ai/image-fetch.ts`**

Create:

```ts
import { nanoid } from "nanoid";
import { uploadToR2 } from "@/lib/storage/images";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_FETCH_TIMEOUT_MS = 10_000;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export type FetchImageResult =
  | { ok: true; key: string; contentType: string; size: number }
  | { ok: false; reason: "ssrf" | "bad_status" | "bad_content_type" | "too_large" | "timeout" | "fetch_failed" };

/**
 * Rejects URLs that could hit internal networks. DNS lookup is not available
 * inside Workers, so we rely on host-based heuristics: literal IP in private
 * ranges, or common internal hostnames. Any DNS name resolves to whatever the
 * Cloudflare edge resolves it to — this is a best-effort guard, not absolute.
 */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "metadata.google.internal") return true;

  // IPv4 literal ranges
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }
  // IPv6 literal (fast-path for the most common internal ranges)
  if (h.startsWith("[") && h.endsWith("]")) {
    const inner = h.slice(1, -1);
    if (inner === "::1" || inner.startsWith("fc") || inner.startsWith("fd") || inner.startsWith("fe80:")) return true;
  }
  return false;
}

export async function fetchAndUploadImage(
  draftId: string,
  url: string,
): Promise<FetchImageResult> {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { ok: false, reason: "ssrf" }; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { ok: false, reason: "ssrf" };
  if (isBlockedHost(parsed.hostname)) return { ok: false, reason: "ssrf" };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), IMAGE_FETCH_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(parsed.toString(), { signal: ac.signal, redirect: "follow" });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") return { ok: false, reason: "timeout" };
    return { ok: false, reason: "fetch_failed" };
  }
  clearTimeout(timer);

  if (!resp.ok) return { ok: false, reason: "bad_status" };

  const ct = (resp.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(ct)) return { ok: false, reason: "bad_content_type" };

  // Bounded read — stream into a single buffer, abort when exceeding the cap.
  const reader = resp.body?.getReader();
  if (!reader) return { ok: false, reason: "fetch_failed" };

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > IMAGE_MAX_BYTES) {
      try { await reader.cancel(); } catch { /* ignore */ }
      return { ok: false, reason: "too_large" };
    }
    chunks.push(value);
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { buffer.set(c, offset); offset += c.byteLength; }

  const ext = EXT_BY_TYPE[ct] ?? "jpg";
  const key = `products/${draftId}/${nanoid(10)}.${ext}`;
  const file = new File([buffer], key, { type: ct });
  await uploadToR2(file, key);

  return { ok: true, key, contentType: ct, size: total };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run __tests__/unit/ai/image-fetch.test.ts
```

Expected: PASS × 6.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/image-fetch.ts __tests__/unit/ai/image-fetch.test.ts
git commit -m "feat(admin): add image-fetch helper with SSRF/size/type guards"
```

---

## Task 7 — Product research (Claude streaming)

**Files:**
- Create: `lib/ai/product-research.ts`
- Test: `__tests__/unit/ai/product-research.test.ts`

This task replaces the Anthropic SDK's streaming call with a pure generator over mocked events. The real SDK is only called in production; tests feed synthetic stream events to the parser.

- [ ] **Step 1: Define the public interface first (no test yet; just the types and dispatch shape so the test has types to target)**

Create `lib/ai/product-research.ts` with the interface only:

```ts
import type Anthropic from "@anthropic-ai/sdk";
import { parseAiToolInput, type AiProductOutput } from "@/lib/validations/product-ai";
import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";

export type ResearchProgress =
  | { type: "progress"; step: "search" | "specs" | "images" | "finalize" }
  | { type: "done"; output: AiProductOutput }
  | { type: "not_found"; reason: string }
  | { type: "error"; code: "invalid_ai_output" | "api_error" | "feature_disabled" };

export const MODEL = "claude-sonnet-4-6";

// Custom "submit" tool; Claude calls it exactly once to end the generation.
export const SUBMIT_TOOL_NAME = "submit_product";

export function buildSystemPrompt(): string {
  // Lists every allowed icon name inline so Claude can pick matching ones.
  const icons = HIGHLIGHT_ICON_NAMES.join(", ");
  return [
    "Tu es rédacteur catalogue pour une boutique d'électronique en Côte d'Ivoire.",
    "Réponds TOUJOURS en français. Ne parle jamais à l'utilisateur : tes seules sorties doivent être l'utilisation des outils.",
    "Étapes :",
    "1. Utilise web_search pour vérifier l'existence du produit, ses spécifications officielles et trouver des images.",
    "2. Si le produit est introuvable ou trop ambigu, appelle submit_product avec { \"not_found\": true, \"reason\": \"…\" }.",
    "3. Sinon, appelle submit_product avec une fiche complète.",
    "Règles :",
    "- N'invente aucune caractéristique. Omets plutôt.",
    "- Ne génère PAS de prix ni de stock (ne sont pas dans le schéma).",
    "- Pour chaque highlight, choisis un icône parmi cette liste exacte : " + icons + ".",
    "- image_candidates : 6 à 10 URLs d'images directes (jpg/png/webp), privilégie les sites constructeurs et la presse ; évite les watermarks.",
    "- Les descriptions suivent un style Apple : tagline courte et percutante, highlights concis, feature_blocks éditoriaux avec un titre et un corps de 1-2 paragraphes.",
  ].join("\n");
}

export function buildTools(): Anthropic.Tool[] {
  return [
    {
      // Native Anthropic web search. Counts as a paid usage.
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5,
    } as unknown as Anthropic.Tool,
    {
      name: SUBMIT_TOOL_NAME,
      description: "Soumet la fiche produit complète (ou signale que le produit est introuvable).",
      input_schema: {
        type: "object",
        additionalProperties: true, // validated strictly by Zod after; keep loose here
      },
    },
  ];
}

/** Drives the Anthropic stream and yields typed events. */
export async function* researchProduct(
  prompt: string,
  anthropic: Anthropic,
): AsyncGenerator<ResearchProgress> {
  let emittedSearch = false;
  let emittedImages = false;
  let emittedSpecs = false;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: buildSystemPrompt(),
    tools: buildTools(),
    messages: [{ role: "user", content: prompt }],
  });

  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "web_search") {
      const q = (block.input as { query?: string } | undefined)?.query ?? "";
      if (!emittedSearch) { yield { type: "progress", step: "search" }; emittedSearch = true; }
      if (!emittedSpecs && /spec|caract/i.test(q)) { yield { type: "progress", step: "specs" }; emittedSpecs = true; }
      if (!emittedImages && /image|photo/i.test(q)) { yield { type: "progress", step: "images" }; emittedImages = true; }
    }
    if (block.type === "tool_use" && block.name === SUBMIT_TOOL_NAME) {
      yield { type: "progress", step: "finalize" };
      const parsed = parseAiToolInput(block.input);
      if (parsed.kind === "ok") { yield { type: "done", output: parsed.output }; return; }
      if (parsed.kind === "not_found") { yield { type: "not_found", reason: parsed.reason }; return; }
      yield { type: "error", code: "invalid_ai_output" };
      return;
    }
  }

  // Stream ended without submit_product — treat as API error
  yield { type: "error", code: "api_error" };
}
```

- [ ] **Step 2: Write the failing test**

Create `__tests__/unit/ai/product-research.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { researchProduct, type ResearchProgress } from "@/lib/ai/product-research";
import type Anthropic from "@anthropic-ai/sdk";

function makeAnthropicStub(content: unknown[]): Anthropic {
  return {
    messages: {
      create: async () => ({ content, stop_reason: "end_turn" }),
    },
  } as unknown as Anthropic;
}

async function drain(iter: AsyncGenerator<ResearchProgress>): Promise<ResearchProgress[]> {
  const out: ResearchProgress[] = [];
  for await (const ev of iter) out.push(ev);
  return out;
}

const validOutput = {
  name: "Galaxy A55",
  category_suggestion: "smartphones",
  attributes: { colors: [], dimensions: {}, specs: [] },
  story: {},
  seo: {},
  image_candidates: [{ url: "https://x.test/a.jpg", source_domain: "x.test" }],
};

describe("researchProduct", () => {
  it("émet progress puis done pour une sortie valide", async () => {
    const anthropic = makeAnthropicStub([
      { type: "tool_use", name: "web_search", id: "1", input: { query: "Galaxy A55" } },
      { type: "tool_use", name: "web_search", id: "2", input: { query: "Galaxy A55 images" } },
      { type: "tool_use", name: "submit_product", id: "3", input: validOutput },
    ]);

    const events = await drain(researchProduct("Galaxy A55", anthropic));

    expect(events.map((e) => e.type)).toEqual(["progress", "progress", "progress", "done"]);
    expect((events.at(-1) as { type: "done"; output: typeof validOutput }).output.name).toBe("Galaxy A55");
  });

  it("émet not_found", async () => {
    const anthropic = makeAnthropicStub([
      { type: "tool_use", name: "submit_product", id: "x", input: { not_found: true, reason: "unknown" } },
    ]);
    const events = await drain(researchProduct("zxzx", anthropic));
    expect(events.at(-1)).toEqual({ type: "not_found", reason: "unknown" });
  });

  it("émet error pour une sortie invalide", async () => {
    const anthropic = makeAnthropicStub([
      { type: "tool_use", name: "submit_product", id: "x", input: { garbage: true } },
    ]);
    const events = await drain(researchProduct("x", anthropic));
    expect(events.at(-1)).toEqual({ type: "error", code: "invalid_ai_output" });
  });

  it("émet error si submit_product jamais appelé", async () => {
    const anthropic = makeAnthropicStub([
      { type: "text", text: "hmm" },
    ]);
    const events = await drain(researchProduct("x", anthropic));
    expect(events.at(-1)).toEqual({ type: "error", code: "api_error" });
  });
});
```

- [ ] **Step 3: Run the tests**

Run:

```bash
npx vitest run __tests__/unit/ai/product-research.test.ts
```

Expected: PASS × 4 (the implementation was written in Step 1 before the test per the "interface first" convention here — reviewing the output now locks in the contract).

- [ ] **Step 4: Commit**

```bash
git add lib/ai/product-research.ts __tests__/unit/ai/product-research.test.ts
git commit -m "feat(admin): add Claude-backed product research generator"
```

---

## Task 8 — Route Handler (streaming NDJSON)

**Files:**
- Create: `app/api/admin/products-ai/generate/route.ts`

Route Handler-based so the client can consume a stream. No dedicated test: the handler mostly wires together already-tested pieces; tests would mostly assert glue.

- [ ] **Step 1: Create the handler**

Create `app/api/admin/products-ai/generate/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/guards";
import { aiPromptSchema } from "@/lib/validations/product-ai";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { getAnthropicClient, isAiFeatureEnabled } from "@/lib/ai/client";
import { researchProduct } from "@/lib/ai/product-research";

export const runtime = "edge"; // runs inside the OpenNext worker like the rest of the app

export async function POST(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  if (!isAiFeatureEnabled(env)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let session;
  try { session = await requireAdmin(); }
  catch { return new NextResponse("Forbidden", { status: 403 }); }

  const body = await req.json().catch(() => null) as { prompt?: unknown } | null;
  const parsed = aiPromptSchema.safeParse(body?.prompt);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_prompt", issues: parsed.error.issues }, { status: 400 });
  }

  const rl = await checkRateLimit(session.user.id);
  if (!rl.ok) {
    return new NextResponse(JSON.stringify({ error: "rate_limited", retryAfterSec: rl.retryAfterSec }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": String(rl.retryAfterSec) },
    });
  }

  const anthropic = await getAnthropicClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        for await (const ev of researchProduct(parsed.data, anthropic)) {
          write(ev);
        }
      } catch (err) {
        console.error("[ai-product] route stream error:", err);
        write({ type: "error", code: "api_error" });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: 0.

- [ ] **Step 3: Commit**

```bash
git add "app/api/admin/products-ai/generate/route.ts"
git commit -m "feat(admin): add AI product generation streaming route"
```

---

## Task 9 — Server action: importCandidateImages

**Files:**
- Create: `actions/admin/products-ai.ts`
- Test: `__tests__/unit/actions/products-ai.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/actions/products-ai.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockAdminSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const err = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    err.digest = `NEXT_REDIRECT;${url}`;
    throw err;
  }),
  execute: vi.fn(),
  queryFirst: vi.fn(),
  query: vi.fn(),
  fetchAndUploadImage: vi.fn(),
  revalidatePath: vi.fn(),
  dbBatch: vi.fn(),
  prepare: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }) }));
vi.mock("@/lib/db", () => ({
  execute: mocks.execute,
  queryFirst: mocks.queryFirst,
  query: mocks.query,
}));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: async () => ({
    prepare: (sql: string) => { mocks.prepare(sql); return { bind: (..._args: unknown[]) => ({ sql, args: _args }) }; },
    batch: (stmts: unknown[]) => mocks.dbBatch(stmts),
  }),
}));
vi.mock("@/lib/ai/image-fetch", () => ({ fetchAndUploadImage: mocks.fetchAndUploadImage }));

import { importCandidateImages } from "@/actions/admin/products-ai";

const OUTPUT = {
  name: "Galaxy A55",
  brand: "Samsung",
  category_suggestion: "smartphones",
  description_html: "<p>Hi</p>",
  short_description: "short",
  attributes: {
    colors: [{ name: "Noir", hex: "#111111" }],
    dimensions: { length_mm: 160 },
    specs: [{ name: "Écran", value: '6.6" AMOLED' }],
  },
  story: {
    tagline: "tag",
    highlights: [
      { icon: "camera", label: "l1" },
      { icon: "battery", label: "l2" },
      { icon: "display", label: "l3" },
    ],
    feature_blocks: [
      { title: "t1", body: "b1" },
      { title: "t2", body: "b2" },
    ],
    faq: [{ question: "q", answer: "a" }],
  },
  seo: { meta_title: "Galaxy A55", meta_description: "d" },
  image_candidates: [
    { url: "https://x.test/a.jpg", source_domain: "x.test" },
    { url: "https://x.test/b.jpg", source_domain: "x.test" },
  ],
};

describe("importCandidateImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
    mocks.queryFirst.mockResolvedValue(null);
    mocks.query.mockResolvedValue([]);
    mocks.dbBatch.mockResolvedValue([]);
    mocks.fetchAndUploadImage.mockImplementation(async (_: string, url: string) =>
      ({ ok: true, key: `products/d1/${url.split("/").pop()}`, contentType: "image/jpeg", size: 10 }));
  });

  it("refuse un admin non authentifié", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(importCandidateImages(OUTPUT, ["https://x.test/a.jpg"])).rejects.toThrow("NEXT_REDIRECT");
  });

  it("refuse une URL hors image_candidates", async () => {
    const r = await importCandidateImages(OUTPUT, ["https://evil.test/x.jpg"]);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/invalide/i);
  });

  it("crée le draft + applique les champs + télécharge les images (happy path)", async () => {
    const r = await importCandidateImages(OUTPUT, [
      "https://x.test/a.jpg",
      "https://x.test/b.jpg",
    ]);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.id).toBeTruthy();
      expect(r.warnings).toEqual([]);
    }
    expect(mocks.fetchAndUploadImage).toHaveBeenCalledTimes(2);
    expect(mocks.dbBatch).toHaveBeenCalled();
  });

  it("renvoie warnings pour les images échouées mais crée quand même le draft", async () => {
    mocks.fetchAndUploadImage.mockImplementationOnce(async () => ({ ok: false, reason: "too_large" }));
    mocks.fetchAndUploadImage.mockImplementationOnce(async (_: string, url: string) =>
      ({ ok: true, key: `products/d1/${url.split("/").pop()}`, contentType: "image/jpeg", size: 10 }));

    const r = await importCandidateImages(OUTPUT, [
      "https://x.test/a.jpg",
      "https://x.test/b.jpg",
    ]);
    expect(r.success).toBe(true);
    if (r.success) expect(r.warnings).toEqual(["https://x.test/a.jpg"]);
  });
});
```

Ensure `__tests__/helpers/mocks.ts` exposes `mockAdminSession` (it does — used by auth-guards.test.ts).

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
npx vitest run __tests__/unit/actions/products-ai.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the server action**

Create `actions/admin/products-ai.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth/guards";
import { execute, queryFirst } from "@/lib/db";
import { getDB } from "@/lib/cloudflare/context";
import { slugify, type ActionResult } from "@/lib/utils";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { fetchAndUploadImage } from "@/lib/ai/image-fetch";
import type { AiProductOutput } from "@/lib/validations/product-ai";
import { aiProductOutputSchema } from "@/lib/validations/product-ai";
import {
  taglineSchema,
  highlightsSchema,
  featureBlocksSchema,
  faqSchema,
} from "@/lib/validations/product-story";

type ImportResult = ActionResult & { id?: string; warnings?: string[] };

/** Create a draft + populate every AI-sourced field + attach selected images.
 *  Price, stock, SKU, visibility flags remain at their draft defaults; the admin
 *  fills them in the existing 5-step wizard on /products/{id}/edit. */
export async function importCandidateImages(
  aiOutput: AiProductOutput,
  selectedUrls: string[],
): Promise<ImportResult> {
  await requireAdmin();

  // Re-validate the AI payload server-side (don't trust the client).
  const outputParsed = aiProductOutputSchema.safeParse(aiOutput);
  if (!outputParsed.success) {
    return { success: false, error: "Fiche IA invalide" };
  }
  const output = outputParsed.data;

  const candidateSet = new Set(output.image_candidates.map((c) => c.url));
  if (selectedUrls.length < 1 || selectedUrls.length > 8) {
    return { success: false, error: "Sélectionnez entre 1 et 8 images" };
  }
  for (const u of selectedUrls) {
    if (!candidateSet.has(u)) return { success: false, error: "Sélection d'images invalide" };
  }

  // Validate story sub-sections against the canonical schemas to catch drift.
  const tagline        = taglineSchema.parse(output.story.tagline ?? null);
  const highlights     = output.story.highlights        ? highlightsSchema.parse(output.story.highlights)        : null;
  const featureBlocks  = output.story.feature_blocks    ? featureBlocksSchema.parse(output.story.feature_blocks) : null;
  const faq            = output.story.faq               ? faqSchema.parse(output.story.faq)                      : null;

  // 1) Create the draft row (same idiom as createDraftProduct, inlined to get the id).
  const draftId = nanoid();
  const placeholderSlug = `draft-${draftId}`;
  try {
    await execute(
      `INSERT INTO products (id, category_id, name, slug, base_price, is_active, is_draft, created_at, updated_at)
       VALUES (?, NULL, '', ?, 0, 0, 1, datetime('now'), datetime('now'))`,
      [draftId, placeholderSlug],
    );
  } catch (err) {
    console.error("[admin/products-ai] draft insert failed", err);
    return { success: false, error: "Erreur lors de la création du brouillon" };
  }

  // 2) Resolve category suggestion → category_id (or null).
  const category = await queryFirst<{ id: string }>(
    "SELECT id FROM categories WHERE LOWER(slug) = LOWER(?) LIMIT 1",
    [output.category_suggestion],
  );
  const categoryId = category?.id ?? null;

  // 3) Resolve a unique non-colliding slug from the name.
  const baseSlug = slugify(output.name);
  let finalSlug = baseSlug || placeholderSlug;
  if (baseSlug) {
    let suffix = 1;
    let candidate = baseSlug;
    while (suffix <= 20) {
      const taken = await queryFirst<{ id: string }>(
        "SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1",
        [candidate, draftId],
      );
      if (!taken) { finalSlug = candidate; break; }
      suffix++;
      candidate = `${baseSlug}-${suffix}`;
    }
  }

  // 4) Download images in parallel. Selection order determines primary.
  const fetchResults = await Promise.all(
    selectedUrls.map((url) => fetchAndUploadImage(draftId, url).then((r) => ({ url, r }))),
  );
  const succeeded = fetchResults.filter((x) => x.r.ok) as Array<{ url: string; r: Extract<typeof fetchResults[number]["r"], { ok: true }> }>;
  const failed = fetchResults.filter((x) => !x.r.ok).map((x) => x.url);

  // 5) Sanitize description HTML.
  const descriptionHtml = output.description_html
    ? sanitizeDescriptionHtml(output.description_html, draftId)
    : null;

  // 6) Write everything in a single D1 batch.
  const db = await getDB();
  const stmts: ReturnType<typeof db.prepare>[] = [];

  stmts.push(
    db.prepare(
      `UPDATE products SET
         category_id = ?, name = ?, slug = ?, brand = ?,
         description = ?, description_type = 'html', short_description = ?,
         meta_title = ?, meta_description = ?,
         tagline = ?, highlights = ?, feature_blocks = ?, faq = ?,
         updated_at = datetime('now')
       WHERE id = ? AND is_draft = 1`,
    ).bind(
      categoryId,
      output.name,
      finalSlug,
      output.brand ?? null,
      descriptionHtml,
      output.short_description ?? null,
      output.seo.meta_title ?? null,
      output.seo.meta_description ?? null,
      tagline,
      highlights ? JSON.stringify(highlights) : null,
      featureBlocks ? JSON.stringify(featureBlocks) : null,
      faq ? JSON.stringify(faq) : null,
      draftId,
    ),
  );

  // Attributes: colors (stored as "Name|#hex" under name="Couleur", matching the UI convention),
  // fixed dimensions (Longueur/Hauteur/Largeur/Poids), and free-form specs.
  for (const c of output.attributes.colors) {
    stmts.push(
      db.prepare(
        `INSERT INTO product_attributes (id, product_id, name, value) VALUES (?, ?, 'Couleur', ?)`,
      ).bind(nanoid(), draftId, `${c.name}|${c.hex}`),
    );
  }
  const dims = output.attributes.dimensions;
  const dimFields: Array<[string, number | undefined]> = [
    ["Longueur", dims.length_mm],
    ["Hauteur",  dims.height_mm],
    ["Largeur",  dims.width_mm],
    ["Poids",    dims.weight_g],
  ];
  for (const [label, val] of dimFields) {
    if (val != null) {
      stmts.push(
        db.prepare(`INSERT INTO product_attributes (id, product_id, name, value) VALUES (?, ?, ?, ?)`)
          .bind(nanoid(), draftId, label, String(val)),
      );
    }
  }
  for (const s of output.attributes.specs) {
    stmts.push(
      db.prepare(`INSERT INTO product_attributes (id, product_id, name, value) VALUES (?, ?, ?, ?)`)
        .bind(nanoid(), draftId, s.name, s.value),
    );
  }

  // Images — first successful = primary.
  succeeded.forEach(({ r }, idx) => {
    stmts.push(
      db.prepare(
        `INSERT INTO product_images (id, product_id, url, is_primary, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      ).bind(nanoid(), draftId, `/images/${r.key}`, idx === 0 ? 1 : 0, idx),
    );
  });

  try {
    await db.batch(stmts);
  } catch (err) {
    console.error("[admin/products-ai] batch write failed", err);
    return { success: false, error: "Erreur lors de l'enregistrement de la fiche IA" };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${draftId}/edit`);
  return { success: true, id: draftId, warnings: failed };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run __tests__/unit/actions/products-ai.test.ts
```

Expected: PASS × 4.

- [ ] **Step 5: Type-check the whole project**

Run:

```bash
npx tsc --noEmit
```

Expected: 0.

- [ ] **Step 6: Commit**

```bash
git add actions/admin/products-ai.ts __tests__/unit/actions/products-ai.test.ts
git commit -m "feat(admin): add importCandidateImages server action"
```

---

## Task 10 — Client UI: prompt form

**Files:**
- Create: `components/admin/ai-product/ai-prompt-form.tsx`

- [ ] **Step 1: Implement the prompt form**

Create `components/admin/ai-product/ai-prompt-form.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EXAMPLES = ["iPhone 15 Pro", "Samsung Galaxy A55", "MacBook Air M3", "AirPods Pro 2"];

interface AiPromptFormProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  error?: string | null;
}

export function AiPromptForm({ prompt, onPromptChange, onSubmit, disabled, error }: AiPromptFormProps) {
  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && prompt.trim().length >= 3) onSubmit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="ai-prompt">Décrivez le produit</Label>
        <Input
          id="ai-prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="ex: Samsung Galaxy A55"
          disabled={disabled}
          autoFocus
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          Marque + modèle suffit. Ajoutez la capacité (ex: 128Go) pour un modèle précis.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={disabled}
            onClick={() => onPromptChange(ex)}
            className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={disabled || prompt.trim().length < 3} className="w-full">
        ✨ Générer la fiche
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: 0.

- [ ] **Step 3: Commit**

```bash
git add "components/admin/ai-product/ai-prompt-form.tsx"
git commit -m "feat(admin): add AI prompt form component"
```

---

## Task 11 — Client UI: progress panel

**Files:**
- Create: `components/admin/ai-product/ai-progress-panel.tsx`

- [ ] **Step 1: Implement the progress panel**

Create `components/admin/ai-product/ai-progress-panel.tsx`:

```tsx
"use client";

export type ProgressStep = "search" | "specs" | "images" | "finalize";

const LABELS: Record<ProgressStep, string> = {
  search:   "Recherche du produit",
  specs:    "Récupération des spécifications",
  images:   "Recherche d'images",
  finalize: "Génération de la fiche",
};

const ORDER: ProgressStep[] = ["search", "specs", "images", "finalize"];

interface AiProgressPanelProps {
  completed: Set<ProgressStep>;
  active: ProgressStep | null;
}

export function AiProgressPanel({ completed, active }: AiProgressPanelProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Génération en cours</h2>
      <ul className="space-y-2">
        {ORDER.map((step) => {
          const isDone = completed.has(step);
          const isActive = active === step;
          return (
            <li key={step} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={
                  isDone ? "text-emerald-600" :
                  isActive ? "text-amber-500 animate-pulse" :
                  "text-muted-foreground"
                }
              >
                {isDone ? "✓" : isActive ? "⏳" : "○"}
              </span>
              <span className={isDone || isActive ? "text-foreground" : "text-muted-foreground"}>
                {LABELS[step]}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="pt-2 text-xs text-muted-foreground">Peut prendre jusqu'à 30 secondes.</p>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

Run:

```bash
npx tsc --noEmit
git add "components/admin/ai-product/ai-progress-panel.tsx"
git commit -m "feat(admin): add AI progress panel component"
```

---

## Task 12 — Client UI: image selector

**Files:**
- Create: `components/admin/ai-product/ai-image-selector.tsx`

- [ ] **Step 1: Implement the selector**

Create `components/admin/ai-product/ai-image-selector.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AiProductOutput } from "@/lib/validations/product-ai";

interface AiImageSelectorProps {
  output: AiProductOutput;
  onConfirm: (selectedUrls: string[]) => void;
  onCancel: () => void;
  busy: boolean;
}

const MIN = 1;
const MAX = 8;

export function AiImageSelector({ output, onConfirm, onCancel, busy }: AiImageSelectorProps) {
  const [selected, setSelected] = useState<string[]>(() =>
    output.image_candidates.slice(0, Math.min(4, output.image_candidates.length)).map((c) => c.url),
  );

  function toggle(url: string) {
    setSelected((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= MAX) return prev;
      return [...prev, url];
    });
  }

  const canConfirm = selected.length >= MIN && !busy;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Fiche prête · sélectionnez les images</h2>
        <p className="text-sm text-muted-foreground">
          <strong>{output.name}</strong>
          {output.attributes.colors.length > 0 && ` · ${output.attributes.colors.length} couleurs détectées`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Choisissez {MIN} à {MAX} images. La 1re cochée sera l'image principale.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {output.image_candidates.map((c) => {
          const isSelected = selected.includes(c.url);
          const index = selected.indexOf(c.url);
          return (
            <button
              key={c.url}
              type="button"
              disabled={busy}
              onClick={() => toggle(c.url)}
              className={`group relative overflow-hidden rounded-lg border text-left transition ${
                isSelected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-foreground"
              }`}
            >
              <div className="relative aspect-square bg-muted">
                {/* External host — use plain <img> to avoid next/image remote patterns config. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.url} alt={c.alt ?? ""} className="h-full w-full object-contain" />
                {isSelected && (
                  <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                )}
              </div>
              <p className="truncate px-2 py-1 text-xs text-muted-foreground">{c.source_domain}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Annuler
        </Button>
        <Button type="button" disabled={!canConfirm} onClick={() => onConfirm(selected)}>
          {busy ? "Importation…" : `Importer et continuer (${selected.length})`}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add "components/admin/ai-product/ai-image-selector.tsx"
git commit -m "feat(admin): add AI image selector component"
```

---

## Task 13 — Main client page

**Files:**
- Create: `app/(admin)/products/ai-new/ai-new-client.tsx`
- Create: `app/(admin)/products/ai-new/page.tsx`

- [ ] **Step 1: Implement the state-machine client**

Create `app/(admin)/products/ai-new/ai-new-client.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AiPromptForm } from "@/components/admin/ai-product/ai-prompt-form";
import { AiProgressPanel, type ProgressStep } from "@/components/admin/ai-product/ai-progress-panel";
import { AiImageSelector } from "@/components/admin/ai-product/ai-image-selector";
import { importCandidateImages } from "@/actions/admin/products-ai";
import type { AiProductOutput } from "@/lib/validations/product-ai";

type UiState =
  | { kind: "prompt"; error?: string | null }
  | { kind: "generating"; completed: Set<ProgressStep>; active: ProgressStep | null }
  | { kind: "selecting"; output: AiProductOutput };

export function AiNewClient() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [ui, setUi] = useState<UiState>({ kind: "prompt", error: null });
  const [importing, startImporting] = useTransition();

  const generate = useCallback(async () => {
    const trimmed = prompt.trim();
    setUi({ kind: "generating", completed: new Set(), active: "search" });

    let resp: Response;
    try {
      resp = await fetch("/api/admin/products-ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
    } catch {
      setUi({ kind: "prompt", error: "Impossible de contacter le service. Réessayez." });
      return;
    }

    if (!resp.ok || !resp.body) {
      const msg = resp.status === 429
        ? "Limite de générations atteinte. Réessayez plus tard."
        : "Une erreur est survenue. Réessayez.";
      setUi({ kind: "prompt", error: msg });
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const completed = new Set<ProgressStep>();
    let active: ProgressStep | null = "search";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let event: { type: string; step?: ProgressStep; output?: AiProductOutput; reason?: string; code?: string };
        try { event = JSON.parse(line); } catch { continue; }

        if (event.type === "progress" && event.step) {
          if (active && active !== event.step) completed.add(active);
          active = event.step;
          setUi({ kind: "generating", completed: new Set(completed), active });
        } else if (event.type === "done" && event.output) {
          setUi({ kind: "selecting", output: event.output });
          return;
        } else if (event.type === "not_found") {
          setUi({ kind: "prompt", error: "Produit introuvable. Précisez marque + modèle." });
          return;
        } else if (event.type === "error") {
          setUi({ kind: "prompt", error: "Le modèle n'a pas pu produire une fiche valide. Réessayez." });
          return;
        }
      }
    }
  }, [prompt]);

  const confirmImport = useCallback((selectedUrls: string[]) => {
    if (ui.kind !== "selecting") return;
    startImporting(async () => {
      const r = await importCandidateImages(ui.output, selectedUrls);
      if (!r.success) { toast.error(r.error ?? "Erreur d'import"); return; }
      if (r.warnings && r.warnings.length > 0) {
        toast.warning(`${r.warnings.length} image(s) n'ont pas pu être importées.`);
      }
      router.push(`/products/${r.id}/edit`);
    });
  }, [ui, router]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products" aria-label="Retour">
            <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Créer un produit avec l'IA</h1>
      </div>

      {ui.kind === "prompt" && (
        <AiPromptForm
          prompt={prompt}
          onPromptChange={setPrompt}
          onSubmit={generate}
          disabled={false}
          error={ui.error}
        />
      )}
      {ui.kind === "generating" && (
        <AiProgressPanel completed={ui.completed} active={ui.active} />
      )}
      {ui.kind === "selecting" && (
        <AiImageSelector
          output={ui.output}
          onConfirm={confirmImport}
          onCancel={() => setUi({ kind: "prompt", error: null })}
          busy={importing}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement the server page**

Create `app/(admin)/products/ai-new/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/guards";
import { isAiFeatureEnabled } from "@/lib/ai/client";
import { AiNewClient } from "./ai-new-client";

export default async function AiNewProductPage() {
  await requireAdmin();
  const { env } = await getCloudflareContext({ async: true });
  if (!isAiFeatureEnabled(env)) notFound();

  return <AiNewClient />;
}
```

- [ ] **Step 3: Type-check and commit**

Run:

```bash
npx tsc --noEmit
git add "app/(admin)/products/ai-new"
git commit -m "feat(admin): add AI product creation page and client state machine"
```

---

## Task 14 — Entry button on `/products`

**Files:**
- Modify: `app/(admin)/products/products-page-client.tsx` (mobile toolbar)
- Modify: the file exporting `ProductsPageActions` (desktop header). That export is imported in `app/(admin)/products/page.tsx:12` — open `products-page-client.tsx` and locate `export function ProductsPageActions`.

- [ ] **Step 1: Check whether the feature flag needs to be passed down**

Read `app/(admin)/products/products-page-client.tsx` and locate `ProductsPageActions`. The button should appear whenever the flag is enabled. Since the flag is server-side, pass a boolean prop from the server page down to both mobile and desktop action slots.

- [ ] **Step 2: Modify `app/(admin)/products/page.tsx`**

Compute the flag once and pass to the client:

```tsx
// near the top imports:
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isAiFeatureEnabled } from "@/lib/ai/client";

// inside the component, after requireAdmin():
const { env } = await getCloudflareContext({ async: true });
const aiEnabled = isAiFeatureEnabled(env);

// then pass to the two client components:
//   <ProductFilters categories={categoryOptions} className="flex-1" />
//   <ProductsPageActions aiEnabled={aiEnabled} />          // updated
// ...
//   <ProductsPageClient
//     products={productData}
//     categories={categoryOptions}
//     totalCount={totalCount}
//     aiEnabled={aiEnabled}                                // new prop
//   />
```

- [ ] **Step 3: Modify `app/(admin)/products/products-page-client.tsx`**

Add the `aiEnabled` prop to both the mobile client and `ProductsPageActions`. Insert a `<Link href="/products/ai-new">` button next to the existing "Nouveau" / "Nouveau produit" button, shown only when `aiEnabled`. Use a distinctive visual: keep `variant="outline"` and prepend the sparkle emoji.

Mobile toolbar (around line 44):

```tsx
<div className="flex items-center gap-2">
  {aiEnabled && (
    <Button asChild size="sm" variant="outline">
      <Link href="/products/ai-new">✨ Avec l'IA</Link>
    </Button>
  )}
  <Button asChild size="sm">
    <Link href="/products/new">Nouveau</Link>
  </Button>
</div>
```

For `ProductsPageActions`, mirror the same two buttons. The desktop label can be the longer `"✨ Créer avec l'IA"`.

Update the `ProductsPageClientProps` interface to add `aiEnabled: boolean` and the `ProductsPageActions` signature similarly.

- [ ] **Step 4: Type-check and lint**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: 0 errors from both.

- [ ] **Step 5: Commit**

```bash
git add "app/(admin)/products/page.tsx" "app/(admin)/products/products-page-client.tsx"
git commit -m "feat(admin): link to AI product creation from /products"
```

---

## Task 15 — Smoke-test the flow locally

**Files:** none (manual verification)

- [ ] **Step 1: Set the Anthropic key in the local wrangler env**

If an `.dev.vars` file exists at repo root, add `ANTHROPIC_API_KEY="sk-ant-..."`. Otherwise, create it:

```bash
printf 'ANTHROPIC_API_KEY="sk-ant-your-key"\n' >> .dev.vars
```

- [ ] **Step 2: Start the dev server**

Run:

```bash
npm run dev
```

- [ ] **Step 3: Navigate and test**

- Open `http://localhost:3000/products` after signing in as an admin.
- Verify the `"✨ Avec l'IA"` button is present.
- Click it → lands on `/products/ai-new`.
- Type `Samsung Galaxy A55` → click Generate.
- Watch progress panel tick through.
- Confirm image selection appears with ≥3 candidate thumbnails.
- Select 3 images → Import.
- Verify redirect to `/products/{id}/edit`, wizard opens at step 1, name + category + attributes + story + SEO pre-filled.
- Fill price + stock in step 3, save and publish.
- Confirm product is visible on the storefront.

- [ ] **Step 4: Test the kill-switch**

- Stop the dev server.
- Add `AI_PRODUCT_CREATION_ENABLED="0"` to `.dev.vars`.
- Restart.
- Verify the "Avec l'IA" button is hidden on `/products` and that `/products/ai-new` returns 404.
- Remove the flag and restart.

- [ ] **Step 5: Report any issues**

If any of the steps produce unexpected behaviour, note them for the review step. Otherwise proceed to Task 16.

---

## Task 16 — Final verification and PR

**Files:** none (housekeeping)

- [ ] **Step 1: Full verification**

Run:

```bash
npx tsc --noEmit && npm run lint && npm run test
```

Expected: all 3 exit 0.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feat/ai-product-creation
```

- [ ] **Step 3: Open the PR**

Run:

```bash
gh pr create --title "feat(admin): AI-powered product creation" --body "$(cat <<'EOF'
## Summary
- Adds a "✨ Créer avec l'IA" entry on `/products` that opens a dedicated prompt page.
- Claude Sonnet 4.6 with native web search researches the product; a `submit_product` tool produces a Zod-validated payload (name, attributes, story, SEO, candidate image URLs).
- Admin picks 1–8 images → server downloads to R2 → draft created, existing 5-step wizard opens pre-filled for validation (price + stock left for the admin).
- Kill switch via `AI_PRODUCT_CREATION_ENABLED=0`; rate limit 10 gen/h/admin.

## Test plan
- [ ] Unit tests (`npm run test`) — new suites under `__tests__/unit/ai/*` and `__tests__/unit/actions/products-ai.test.ts`
- [ ] Manual flow on localhost: generate for `iPhone 15 Pro`, confirm pre-fill accuracy, fill price, publish
- [ ] Kill-switch: set `AI_PRODUCT_CREATION_ENABLED=0` → button hidden, `/products/ai-new` returns 404
- [ ] SSRF guard: try to craft a candidate URL pointing at `127.0.0.1` (client-side rejection not possible; exercised via `fetchAndUploadImage` unit tests)
- [ ] Rate limit: run 11 generations in quick succession, verify 11th returns 429 + visible toast

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Report PR URL**

Paste the PR URL in chat and wait for explicit approval before merging.

---

## Self-Review Notes

1. **Spec coverage:**
   - Architecture (spec §Architecture) → Tasks 2–13.
   - AI Contract / schema (spec §AI Contract) → Tasks 5, 7.
   - Security: `requireAdmin`, SSRF, size/content-type, sanitize, rate limit → Tasks 4, 6, 8, 9.
   - UI placement → Tasks 13, 14.
   - Testing (Vitest) → Tasks 3, 4, 5, 6, 7, 9.
   - Rollout / env var gating → Tasks 1, 8, 13, 14, 15.
   - Observability → Task 9 (`console.error/warn` in action), Task 8 (`console.error` in route).
   - Cost estimate, dependencies, rollout → no code tasks; captured in spec and PR body.

2. **Placeholder scan:** no "TBD/TODO/similar to" strings; every step contains concrete code or a concrete command with expected output.

3. **Type consistency:**
   - `ResearchProgress` events (`progress|done|not_found|error`) match between Task 7 (`product-research.ts`) and Task 8 (route handler) and Task 13 (client reader).
   - `AiProductOutput` shape used identically in Tasks 5, 7, 9, 12, 13.
   - `fetchAndUploadImage` signature `(draftId: string, url: string) → FetchImageResult` consistent across Tasks 6 and 9.
   - `checkRateLimit(adminId) → { ok }|{ ok:false, retryAfterSec }` consistent across Tasks 4 and 8.
   - Icon enum imported from `product-story.ts` in Tasks 5 and 7 (no drift).

4. **Known follow-ups (intentionally out of scope):** no preview of the generated description before import (admin sees it in the wizard step 5); no retry-with-correction loop when Claude produces invalid output.
