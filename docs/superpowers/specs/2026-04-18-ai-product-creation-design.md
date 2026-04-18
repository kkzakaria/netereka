# AI-Powered Product Creation — Design Spec

**Date:** 2026-04-18
**Status:** Approved
**Builds on:** [2026-03-19-assisted-product-creation-design.md](./2026-03-19-assisted-product-creation-design.md) (the 5-step wizard this spec plugs into)

## Context

Admins currently create products by typing every field by hand — name, description, attributes, product story (tagline, highlights, feature blocks, FAQ), SEO metadata — and uploading images manually. For well-known consumer electronics (iPhone, Galaxy, MacBook…) most of this information is publicly available. Having the admin retype it is slow and produces inconsistent editorial quality.

This spec adds an AI-assisted path that takes a short text prompt (e.g. `"Samsung Galaxy A55"`) and pre-fills the existing wizard, including suggested product images. The admin still walks through the 5 wizard steps and validates everything before publishing — the AI is an accelerator, not an autopilot.

## Scope

**In scope:**
- New entry point on `/products`: a "✨ Créer avec l'IA" button that opens a dedicated prompt page.
- Server-side call to Anthropic Claude with its native web search tool to research the product.
- Structured extraction (via Claude tool use) of: name, brand, category suggestion, short description, long HTML description, attributes (colors, dimensions/weight, free-form specs), story (tagline/highlights/feature blocks/FAQ), SEO metadata, and candidate image URLs.
- An image selection screen where the admin picks which candidate URLs to import.
- Server-side download of selected images → upload to R2 → attach to the draft product.
- Draft product created with all pre-filled fields, then the existing wizard opens for the admin to validate/correct step by step.

**Out of scope (deferred):**
- AI for existing products (edit flow).
- Multiple products at once (one prompt = one product).
- Storage/RAM variants as separate DB rows — AI targets the most common variant (e.g. 128Go). Admin can re-run with a more specific prompt for other variants.
- Price and stock generation — the AI never fills these (no reliable XOF Côte d'Ivoire source).
- Image generation (the AI only finds existing public image URLs, it does not generate synthetic images).

## Non-Goals

- Replacing the existing wizard. The manual path remains and is the fallback for products where the AI can't help (unknown/niche products, internal SKUs).
- Real-time collaborative editing during generation.

## User Flow

1. Admin on `/products` clicks **"✨ Créer avec l'IA"** (new button next to "Nouveau produit").
2. Lands on `/products/ai-new`. Sees a single prompt input with examples.
3. Types prompt (3-200 chars) → clicks **"Générer la fiche"**.
4. UI transitions to a progress panel. Status lines tick off as Claude emits tool_use events:
   - `✓ Recherche du produit`
   - `✓ Récupération des spécifications`
   - `⏳ Recherche d'images`
   - `○ Génération de la fiche`
5. When generation completes, admin sees a **Selection screen**: detected product name + category + a grid of 6–10 image thumbnails (checkboxes, min 1 / max 8, source domain shown under each). First checked = primary.
6. Admin clicks **"Importer et continuer"**. Server downloads the selected image URLs, uploads them to R2, creates the draft product with all fields pre-filled, and redirects to `/products/{id}/edit`.
7. The existing wizard opens at step 1. All fields are populated. Admin validates/corrects each step, fills **price / stock** manually in step 3, and publishes.

**Error paths:**
- Product not found / too ambiguous → inline error under the prompt, admin retries with a more specific prompt. No DB writes.
- Anthropic API failure after 3 retries with exponential backoff → toast + back to prompt. No DB writes.
- Some images fail to download → draft is still created with the successful ones; admin sees a toast warning with the failed URLs.
- Rate limit hit → explicit error with retry-after time.
- Kill switch `AI_PRODUCT_CREATION_ENABLED=0` → the "Créer avec l'IA" button is hidden and `/products/ai-new` returns 404.

## Architecture

### Files

```
app/(admin)/products/
  ai-new/
    page.tsx                         # Server component, gate on AI_PRODUCT_CREATION_ENABLED + requireAdmin()
    ai-new-client.tsx                # Client: prompt → progress → image selection states

app/api/admin/products-ai/generate/route.ts
                                     # Route Handler (POST, streaming): takes { prompt }, streams
                                     # progress + final AIOutput. Route Handler (not Server Action)
                                     # so the client can consume a ReadableStream progressively.

actions/admin/products-ai.ts         # Server action:
                                     #   - importCandidateImages(aiOutput, selectedUrls): creates draft, returns { id, warnings }

lib/ai/
  client.ts                          # Anthropic SDK singleton (reads ANTHROPIC_API_KEY from CloudflareEnv)
  product-research.ts                # System prompt, tool definitions, orchestration of the Claude call
  image-fetch.ts                     # Fetch URL → validate (SSRF / size / content-type) → upload R2
  rate-limit.ts                      # KV-backed rate limit per admin

lib/validations/product-ai.ts        # Zod schemas for AI output (strict) + prompt

components/admin/ai-product/
  ai-prompt-form.tsx                 # Prompt input + examples
  ai-progress-panel.tsx              # Status-line checklist driven by stream events
  ai-image-selector.tsx              # Candidate image grid with checkboxes

env.d.ts                             # Adds ANTHROPIC_API_KEY + AI_PRODUCT_CREATION_ENABLED
```

No migration is required — the draft pattern (`createDraftProduct()` + `applyDraftUpdate()` + `product_attributes` / `product_variants` / `product_images` inserts) already covers all the fields the AI generates.

### Component Boundaries

- `lib/ai/product-research.ts` — **pure**: given a prompt, returns `{ output: AIProductOutput } | { error: "not_found" | "api_error" }`. Takes the Anthropic client as a dependency so tests can mock it. Knows nothing about the DB or R2.
- `lib/ai/image-fetch.ts` — given a URL, downloads and uploads to R2. Returns `{ r2Key, width, height } | { error }`. SSRF + size + content-type guards live here.
- `actions/admin/products-ai.ts` — composes the two: auth, rate-limit, call research, then on `importCandidateImages` call image-fetch in parallel, then write the DB.
- Client components only call the server actions; they never see `ANTHROPIC_API_KEY` or Anthropic SDK types.

## AI Contract

### Model & Tools

- Model: `claude-sonnet-4-6`.
- Tools passed to Claude:
  - `web_search_20250305` (Anthropic native) — Claude uses this ~3–5 times per generation.
  - `submit_product` (custom tool) — defined with a JSON schema matching `AIProductOutput` below. Claude fills this tool to end the generation; its input becomes the structured output.

### System Prompt (shape)

- Role: "You are a product catalog writer for an electronics e-commerce in Côte d'Ivoire. Write in French."
- Task: "Given a product prompt, research the product online and submit a complete catalog entry via the `submit_product` tool."
- Guardrails:
  - Do not invent specifications. If a spec is uncertain, omit it.
  - For colors, return name + hex (hex inferred from the color name if not available).
  - For image candidates: prefer manufacturer and press sites. Avoid marketplaces with watermarks. Return 6–10 direct image URLs, each with `source_domain` and `alt`.
  - If the product cannot be confidently identified, call `submit_product` with `{ "not_found": true, "reason": "..." }` instead of guessing.
  - Story output follows the existing "Apple-like product story" style used by the storefront (`ProductStorySection`): terse tagline, 3–5 highlights, 2–4 feature blocks with a heading and 1–2 paragraph body, 3–5 FAQ entries.
  - Meta title ≤ 60 chars, meta description ≤ 160 chars, tagline ≤ 80 chars, short description ≤ 120 chars.

### `AIProductOutput` Zod schema

```ts
const aiProductOutputSchema = z.object({
  not_found: z.literal(false).default(false),
  name: z.string().min(1).max(150),
  brand: z.string().max(80).optional(),
  category_suggestion: z.string().min(1),            // slug; server matches against categories table
  short_description: z.string().max(120).optional(),
  description_html: z.string().optional(),           // sanitized server-side before storage
  attributes: z.object({
    colors: z.array(z.object({
      name: z.string().min(1).max(40),
      hex: z.string().regex(/^#[0-9a-f]{6}$/i),
    })).max(12).default([]),
    dimensions: z.object({
      length_mm: z.number().int().positive().optional(),
      height_mm: z.number().int().positive().optional(),
      width_mm:  z.number().int().positive().optional(),
      weight_g:  z.number().int().positive().optional(),
    }).default({}),
    specs: z.array(z.object({
      name: z.string().min(1).max(60),
      value: z.string().min(1).max(200),
    })).max(20).default([]),
  }).default({ colors: [], dimensions: {}, specs: [] }),
  // Story sub-shapes mirror lib/validations/product-story.ts — the canonical DB shape.
  // Highlights use an *icon* enum (curated HIGHLIGHT_ICON_NAMES list) and a short *label*,
  // not free-form title/description. Feature blocks use title/body/image_url/image_alt.
  // The AI must pick icon names from the allowed list only.
  story: z.object({
    tagline: z.string().max(200).optional(),
    highlights: z
      .array(z.object({
        icon: z.enum(HIGHLIGHT_ICON_NAMES),       // imported from product-story.ts
        label: z.string().trim().min(1).max(80),
      }))
      .min(3).max(6).optional(),                  // null/absent = "highlights disabled"
    feature_blocks: z
      .array(z.object({
        title: z.string().trim().min(1).max(120),
        body:  z.string().trim().min(1).max(600),
        // image_url / image_alt omitted — AI doesn't have block-level images
      }))
      .min(2).max(4).optional(),                  // null/absent = "blocks disabled"
    faq: z
      .array(z.object({
        question: z.string().trim().min(1).max(160),
        answer:   z.string().trim().min(1).max(600),
      }))
      .max(5).optional(),                         // null/absent = "no faq"
  }).default({}),
  seo: z.object({
    meta_title: z.string().max(60).optional(),
    meta_description: z.string().max(160).optional(),
  }).default({}),
  image_candidates: z.array(z.object({
    url: z.string().url(),
    source_domain: z.string(),
    alt: z.string().max(200).optional(),
  })).min(1).max(12),
});

// Discriminated union at the top level via a second schema (not_found case):
const aiNotFoundSchema = z.object({
  not_found: z.literal(true),
  reason: z.string().max(300),
});
```

### Alignment with existing schemas

- `story` fields map 1:1 to `taglineSchema / highlightsSchema / featureBlocksSchema / faqSchema` in `lib/validations/product-story.ts`. The AI sub-schemas above deliberately reuse the shapes and caps from that file; importing `HIGHLIGHT_ICON_NAMES` from there keeps the icon enum in sync. Before persisting we pass each story section through the canonical schema a second time to catch any drift.
- `description_html` is passed through `sanitizeDescriptionHtml()` (existing) before insertion; we set `description_type = "html"`.
- The system prompt must list the allowed icon names explicitly so Claude can pick matching ones for each highlight (a phone product would pick `smart-phone`, `camera`, `battery`, etc.).

## Server-Side Flow

### `POST /api/admin/products-ai/generate` (Route Handler)

A Route Handler rather than a Server Action because we need to stream progress events to the client as Claude emits them. Server Actions do not support streaming responses to the browser; Route Handlers return a `Response` with a `ReadableStream`, which the client consumes via `fetch()` + `response.body.getReader()`.

1. `await requireAdmin()` → `session`. Not authenticated or not admin → `401` / `403`.
2. Check `AI_PRODUCT_CREATION_ENABLED !== "0"`. Otherwise → `404` (feature hidden).
3. Validate prompt with Zod: trimmed, 3–200 chars, no control chars. Invalid → `400`.
4. Rate limit: KV key `ai_gen:{session.user.id}`. Window 1 hour, max 10. If exceeded → `429` with `Retry-After` header.
5. Return a `Response` whose body is a `ReadableStream` of newline-delimited JSON events (NDJSON):
   - `{ "type": "progress", "step": "search" | "specs" | "images" | "finalize" }` — emitted as Claude's stream surfaces matching tool_use events.
   - `{ "type": "done", "output": AIProductOutput }` or `{ "type": "not_found", "reason": "..." }` or `{ "type": "error", "code": "invalid_ai_output" | "api_error" }` — terminal event.
6. Internally: call `lib/ai/product-research.ts#researchProduct(prompt)` which wraps `client.messages.stream(...)` with both tools registered and yields progress events. The final `submit_product` tool input is parsed against `aiProductOutputSchema` / `aiNotFoundSchema`. Validation failure → `{ type: "error", code: "invalid_ai_output" }` + server log with the raw tool input.

### `importCandidateImages(aiOutput, selectedUrls)`

1. `await requireAdmin()`.
2. Validate `selectedUrls`: array of strings, 1–8, each present in `aiOutput.image_candidates`. Reject anything else (prevents client from injecting arbitrary URLs).
3. Call `createDraftProduct()` (existing) → `draftId`.
4. **Map category:** look up `aiOutput.category_suggestion` against the `categories` table by slug (case-insensitive). If no match, `category_id = null`.
5. **Download images in parallel** (`Promise.allSettled`):
   - For each URL, call `fetchAndUploadImage(draftId, url)`. The helper enforces:
     - `fetch` with 10s timeout.
     - Resolved host must not be localhost / RFC1918 / link-local (SSRF protection — DNS-resolve and compare before fetching).
     - Response `Content-Type` starts with `image/` and is one of `image/jpeg`, `image/png`, `image/webp`, `image/avif`.
     - Response body ≤ 5 MB (enforced while reading the stream, abort on overflow).
   - On success: upload to R2 under `products/{draftId}/{nanoid(10)}.{ext}` via existing `uploadToR2()`.
6. Insert `product_images` rows in selection order; the first successful one is `is_primary = 1`.
7. Write all AI fields via a single `db.batch([...])`:
   - `UPDATE products SET name, brand, slug, category_id, description, description_type='html', short_description, meta_title, meta_description, tagline, highlights, feature_blocks, faq WHERE id = draftId AND is_draft = 1` (existing `applyDraftUpdate` helper).
   - `INSERT INTO product_attributes (...)` — dimensions + specs + all colors as `Couleur` entries using the existing value format `"Name|#hex"`.
   - **No `product_variants` inserts at this stage.** Variants require a price, which the admin sets in step 3 of the wizard. The wizard's step-attributes and step-pricing components already read the `Couleur` attributes and build the variant grid there. This matches how `saveDraftStep` works today (attributes in step 2, variants in step 3).
8. `revalidatePath("/products")` + `revalidatePath("/products/{draftId}/edit")`.
9. Return `{ success: true, id: draftId, warnings: failedUrls }`.

Failure handling:
- If `createDraftProduct()` fails → return the error, no cleanup needed (nothing else written yet).
- If all image downloads fail → still return success with the draft id and `warnings = selectedUrls`. The admin lands on the wizard with zero images; step 4 (Médias) lets them upload manually. The AI-generated text fields are the main value and shouldn't be lost to an image fetch issue.
- If some image downloads fail → include failed URLs in `warnings` so the client can surface a toast.

## Client Flow

`ai-new-client.tsx` is a single client component with a 3-state reducer:

- `state = "prompt"` → renders `<AiPromptForm />`
- `state = "generating"` → renders `<AiProgressPanel steps={...} />`, consumes the progress stream
- `state = "selecting"` → renders `<AiImageSelector output={output} onConfirm={...} />`

Transitions:
- `prompt → generating` on submit (disables the button to prevent double-submit, also prevents prompt editing during generation)
- `generating → selecting` on `{ type: "done" }` event
- `generating → prompt` on `{ type: "error" }` or `not_found` result, with a toast/error banner preserving the prompt
- `selecting → loading indicator → redirect` when admin confirms

## UI Placement

- **`/products` page header:** insert a new `<Button variant="outline">` labeled `"✨ Créer avec l'IA"` to the left of the existing `"Nouveau produit"` button. Button is hidden when `AI_PRODUCT_CREATION_ENABLED === "0"`.
- **`/products/ai-new` page:** `max-w-2xl` centered layout, matches the wizard's visual style. Includes a "← Retour" link to `/products`.

## Security

- `ANTHROPIC_API_KEY` is only accessed server-side via `getCloudflareContext().env`. It is never in the response payload or client bundle.
- `requireAdmin()` gates both server actions and the page.
- SSRF protection in `image-fetch.ts`: **host-literal checks only** (Cloudflare Workers do not expose DNS resolution to user code, so we cannot reject a hostname that resolves to an internal IP). We reject URL hosts that are literal private IPs (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `0.0.0.0`, `::1`, `fc00::/7`, `fe80::/10`, `metadata.google.internal`, `localhost` and its subdomains) and non-`http(s)` schemes. This is defence against direct IP literals from Claude or malicious redirects; a resolver-side DNS rebinding attack is not fully mitigated. The content-type whitelist and 5 MB size cap are the other main guards.
- Size limit (5 MB) enforced while streaming the response body; abort on overflow so we never buffer more than the limit.
- Content-type whitelist enforces image-only uploads.
- `sanitizeDescriptionHtml()` applied to `description_html` before storage (reuses existing sanitizer).
- Rate limit (10 gen/h/admin) — counts **attempts**, not successes. Incrementing only on success would let a misbehaving client hammer the Anthropic API (which we pay for) without tripping the limit, so the counter bumps before the API call. An admin whose generation fails still "pays" one slot; this trade favours cost control over UX.

## Observability

- `console.info("[ai-product] generation start", { promptLen, adminId })`
- `console.info("[ai-product] generation done", { adminId, durationMs, toolCalls, imageCandidates })`
- `console.error("[ai-product] validation failed", { rawOutputSize, zodIssues })`
- `console.warn("[ai-product] image fetch failed", { url, reason })`
- No PII in logs beyond `adminId`.

## Environment Variables

Added to `env.d.ts`:

```ts
interface CloudflareEnv {
  // existing...
  ANTHROPIC_API_KEY: string;
  AI_PRODUCT_CREATION_ENABLED?: string; // "0" disables the feature; any other value / unset = enabled
  AI_MODEL?: string;                    // override the default Anthropic model id without a code change
}
```

Deployment: add `ANTHROPIC_API_KEY` to Cloudflare Workers secrets via `wrangler secret put ANTHROPIC_API_KEY`.

## Testing Strategy

Vitest-only (no e2e hitting the real Claude API — cost + flakiness).

- `lib/ai/product-research.test.ts`
  - Mocks `@anthropic-ai/sdk` stream; asserts tool-use events translate to progress events.
  - Fixture: valid `submit_product` tool input → schema parses, `{ success: true, output }` returned.
  - Fixture: malformed `submit_product` input → `{ success: false, error: "invalid_ai_output" }`, logs the raw input.
  - Fixture: `not_found` tool input → `{ success: false, error: "not_found" }`.
  - API 429 / 500 → retry 3× with exponential backoff (mock `setTimeout`), final failure returns `{ success: false, error: "api_error" }`.

- `lib/ai/image-fetch.test.ts`
  - Valid image (mocked `fetch` returning a small PNG) → uploaded to R2, returns success.
  - URL with private IP → rejected without a network call.
  - Non-image content-type → rejected.
  - Body > 5 MB → abort + reject.
  - Fetch timeout → reject.

- `lib/ai/rate-limit.test.ts`
  - 1st–10th call: allowed. 11th: rejected with `retryAfterSec`.
  - Separate admin ids don't share the bucket.

- `actions/admin/products-ai.test.ts`
  - `requireAdmin()` enforced (mock `getSession` returning `customer` → rejected).
  - Feature disabled env → rejected.
  - `importCandidateImages` with a URL not in `aiOutput.image_candidates` → rejected.
  - Happy path: draft created, attributes + variants + images inserted, correct `revalidatePath` calls.
  - Partial image failure: still creates draft, returns `warnings`.

No snapshot of the AI prompt text — asserting exact wording is brittle.

## Cost Estimate

- Claude Sonnet 4.6 + web search per generation: ~0.10–0.30 USD.
- At 2 admins × 10 gen/day = ~6 USD/day ceiling (enforced by rate limit).
- R2 storage: negligible (typical 4–6 images × ~200 KB = ~1 MB per product).

## Dependencies Added

- `@anthropic-ai/sdk` — only runtime dependency added.

## Rollout

1. Merge with `AI_PRODUCT_CREATION_ENABLED` unset (feature on by default once the secret is provisioned).
2. If the Anthropic secret is not yet provisioned, set `AI_PRODUCT_CREATION_ENABLED=0` in the Workers env to hide the button cleanly.
3. Monitor logs for the first week — validation failures, image-fetch failures, cost per admin — then tune rate limit / prompt if needed.

## Open Questions

None at time of writing. The price/stock decision is settled (never AI-generated). Variants are settled (single product per prompt, colors only; storage is part of the name).
