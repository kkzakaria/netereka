# Admin AI Integration — Design Document

**Date:** 2026-02-18
**Status:** Approved

## Overview

Integrate Cloudflare Workers AI into the NETEREKA admin panel to assist with content creation: product text, banner text, category suggestion, and banner image generation. AI features are exposed as inline buttons (✨) within existing admin forms.

## Decisions

| Aspect | Choice | Rationale |
|---|---|---|
| Provider | Cloudflare Workers AI | Native integration with existing stack, zero network hop, free tier available |
| Plan | Free (10k neurons/day) | Sufficient for ~15-20 text + 2-3 image generations/day |
| Architecture | Server Actions | Consistent with existing codebase patterns, simple to implement |
| Text model | `@cf/meta/llama-3.1-8b-instruct` | Good balance cost/quality, decent French support |
| Image model | `@cf/stabilityai/stable-diffusion-xl-base-1.0` | Available on Workers AI, suitable for banner backgrounds |
| UX | Inline ✨ buttons per field group | Minimal UI disruption, admin keeps full control |
| Language | French only | Matches Ivory Coast target market |
| Image scope | Banners/promo only | Product photos should be real; AI images suit promotional backgrounds |

## Infrastructure

### Wrangler binding

Add to `wrangler.jsonc`:

```jsonc
"ai": {
  "binding": "AI"
}
```

### Environment type

Add to `env.d.ts`:

```typescript
AI: Ai; // Workers AI binding
```

### AI helper module

```
lib/ai/index.ts     — getAI() helper via getCloudflareContext()
lib/ai/prompts.ts   — Prompt templates per domain
```

`getAI()` mirrors the existing `getDB()`, `getKV()`, `getR2()` pattern.

### Neuron budget estimates

| Task | Model | Neurons/req |
|---|---|---|
| Product text (4 fields) | llama-3.1-8b-instruct | ~50-80 |
| Banner text (4 fields) | llama-3.1-8b-instruct | ~30-50 |
| Category suggestion | llama-3.1-8b-instruct | ~20-30 |
| Banner image | stable-diffusion-xl-base-1.0 | ~500-800 |

## Server Actions

All actions in `actions/admin/ai.ts`, protected by `requireAdmin()`, returning `ActionResult`.

### 1. generateProductText

**Input:** `{ name: string, categoryName?: string, brand?: string }`
**Output:** `{ description, shortDescription, metaTitle, metaDescription }`

Single LLM call generates all 4 fields. System prompt: e-commerce copywriter specialized in electronics, Ivory Coast market, French, prices in FCFA. Response as structured JSON.

### 2. generateBannerText

**Input:** `{ productName?: string, promotion?: string, theme?: string }`
**Output:** `{ title, subtitle, ctaText, badgeText? }`

Single LLM call. Prompt: promotional copywriter, punchy and short. JSON response.

### 3. suggestCategory

**Input:** `{ productName: string, description?: string }`
**Output:** `{ suggestions: Array<{ categoryId, categoryName, confidence }> }`

The prompt includes the full list of existing categories fetched via `getCategoryTree()`. The LLM picks from real categories only — no hallucination possible. Returns top 3 ranked by relevance.

### 4. generateBannerImage

**Input:** `{ prompt: string, style?: "product" | "abstract" | "lifestyle" }`
**Output:** `{ imageUrl: string }`

Flow: generate via Stable Diffusion → upload to R2 at `banners/ai-{nanoid}.png` → return URL. Admin previews and can regenerate or keep.

### Error handling

- Quota exceeded (HTTP 429) → `{ success: false, error: "Limite IA quotidienne atteinte. Réessayez demain." }`
- Model unavailable → `{ success: false, error: "Service IA temporairement indisponible." }`
- JSON parse failure → 1 retry with reinforced prompt, then error

## UI Components

### AiGenerateButton

```
components/admin/ai-generate-button.tsx
```

Reusable `"use client"` component. Props: `onGenerate`, `onResult`, `label?`.

States:
- **Idle:** Subtle button with ✨ icon
- **Loading:** Spinner + "Génération..." — button disabled
- **Success:** Brief green flash, fields populated
- **Error:** Sonner toast with error message

### Product form integration

`components/admin/product-form-sections.tsx` modifications:

| Section | Button | Behavior |
|---|---|---|
| Informations générales | ✨ "Générer les textes" | Calls `generateProductText` → fills `description`, `short_description` |
| SEO | ✨ "Générer SEO" | Same action → fills `metaTitle`, `metaDescription` |
| Catégorie | ✨ "Suggérer" | Calls `suggestCategory` → shows 3 clickable chips with confidence % |

**Prerequisite:** `name` field must be filled. Button disabled with tooltip "Entrez d'abord le nom du produit" when empty.

SEO button is separate because admins often adjust name/description before generating SEO metadata.

Category suggestions displayed as chips below the cascading select:

```
[Smartphones (92%)]  [Téléphonie (78%)]  [Accessoires (45%)]
```

Click = auto-selects parent + child in cascading dropdowns.

### Banner form integration

`components/admin/banner-form.tsx` modifications:

| Section | Button | Behavior |
|---|---|---|
| Informations | ✨ "Générer les textes" | Calls `generateBannerText` → fills `title`, `subtitle`, `ctaText`, `badgeText` |
| Image | ✨ "Générer une image" | Opens dialog with prompt field + style selector |

Banner image generation flow:
1. Click ✨ → dialog with text prompt + style picker (product/abstract/lifestyle)
2. "Générer" → spinner (5-10s)
3. Image preview in dialog
4. "Utiliser cette image" → R2 upload + inject into form
5. Or "Régénérer" → re-run

## Testing

Unit tests in `__tests__/actions/admin/ai.test.ts`:

- Mock `env.AI.run()` for each action
- Verify `requireAdmin()` is called
- Verify JSON parsing (valid + malformed + retry)
- Verify `suggestCategory` only returns existing categories
- Verify R2 upload for `generateBannerImage`
- Verify error messages (quota, model unavailable)

No E2E tests — AI output is non-deterministic. Unit tests with mocks are sufficient.

### Prompt reliability strategy

- Request strict JSON with precise schema in prompt
- Parse with `JSON.parse` + Zod validation of result
- On parse failure → 1 retry with reinforced prompt ("Return ONLY valid JSON, no surrounding text")
- On retry failure → clean error to admin

## Known limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| 10k neurons/day (free plan) | ~15-20 texts + 2-3 images/day | Let Workers AI handle 429, display error message |
| Llama 3.1 8B not always reliable at JSON | Parse can fail | Retry + reinforced prompt |
| Stable Diffusion average quality | Not photo-realistic | Suited for banner backgrounds, not product photos |
| Image latency ~5-10s | Slightly slow UX | Spinner + "Génération en cours..." message |
| French sometimes approximate on 8B | Phrasing not always natural | Admin can edit generated text before saving |

## Out of scope (YAGNI)

- No generation history
- No result caching
- No app-side neuron counter
- No model selection in UI
- No streaming
- No AI-generated product images
