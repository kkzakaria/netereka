import type Anthropic from "@anthropic-ai/sdk";
import { parseAiToolInput, type AiProductOutput } from "@/lib/validations/product-ai";
import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";
import { SUBMIT_PRODUCT_TOOL_SCHEMA } from "@/lib/ai/submit-tool-schema";

export type ResearchErrorCode =
  | "invalid_ai_output"       // Claude returned a submit_product payload we couldn't parse
  | "api_error"               // fallback: unclassified error from the SDK
  | "feature_disabled"        // AI_PRODUCT_CREATION_ENABLED=0
  | "no_credits"              // Anthropic billing: balance too low
  | "auth_failed"             // Invalid or revoked API key
  | "upstream_rate_limited"   // Anthropic 429 — distinct from our per-admin quota
  | "upstream_unavailable"    // Anthropic 5xx / network reachability
  | "timeout";                // our DEFAULT_TIMEOUT_MS AbortController fired

export type ResearchProgress =
  | { type: "progress"; step: "search" | "specs" | "images" | "finalize" }
  | { type: "done"; output: AiProductOutput }
  | { type: "not_found"; reason: string }
  | { type: "error"; code: ResearchErrorCode };

/** Default model. Override per-call via `researchProduct(..., { model })` or via the `AI_MODEL` env var at the caller. */
export const MODEL = "claude-sonnet-4-6";

/** Hard budget for the Anthropic call. Claude with 3-5 web_search invocations typically finishes in 15-45s; 90s is a generous ceiling that still bounds Worker CPU exposure. */
export const DEFAULT_TIMEOUT_MS = 90_000;

export const SUBMIT_TOOL_NAME = "submit_product";

export interface ResearchOptions {
  model?: string;
  timeoutMs?: number;
}

export function buildSystemPrompt(): string {
  const icons = HIGHLIGHT_ICON_NAMES.join(", ");
  return [
    "Tu es rédacteur catalogue pour une boutique d'électronique en Côte d'Ivoire.",
    "Réponds TOUJOURS en français. Ne parle jamais à l'utilisateur : tes seules sorties doivent être l'utilisation des outils.",
    "Étapes :",
    "1. Utilise web_search pour vérifier l'existence du produit, ses spécifications officielles et trouver des images.",
    "2. Si le produit est introuvable ou trop ambigu, appelle submit_product avec { \"not_found\": true, \"reason\": \"…\" }.",
    "3. Sinon, appelle submit_product avec une fiche complète.",
    "Règles :",
    "- Respecte STRICTEMENT le schéma JSON du tool submit_product (champs, nesting, types). En cas de doute, omets le champ.",
    "- N'invente aucune caractéristique. Omets plutôt.",
    "- Ne génère PAS de prix ni de stock (ne sont pas dans le schéma).",
    "- short_description est un RÉSUMÉ court (≤120 caractères), pas une description complète. La description longue va dans description_html.",
    "- tagline, highlights, feature_blocks, faq sont nestés sous story (ex : { story: { tagline, highlights: [...] } }).",
    "- Pour chaque highlight, choisis une icône parmi cette liste exacte : " + icons + ".",
    "- image_candidates : N'INVENTE JAMAIS d'URLs. Inclus UNIQUEMENT des URLs présentes telles quelles dans les résultats web_search (copier-coller exact, jamais reconstruire un pattern type `/imgroot/.../001.jpg` ni deviner un nom de fichier). Si web_search n'a renvoyé aucune URL d'image directement utilisable, retourne `image_candidates: []` — l'admin ajoutera les images après. Format des entrées : { url, source_domain, alt? } — JAMAIS un tableau de strings. Privilégie images directes (jpg/png/webp).",
    "- Les descriptions suivent un style Apple : tagline courte et percutante, highlights concis, feature_blocks éditoriaux avec un titre et un corps de 1-2 paragraphes.",
  ].join("\n");
}

export function buildTools(): Anthropic.ToolUnion[] {
  return [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5,
    },
    {
      name: SUBMIT_TOOL_NAME,
      description: "Soumet la fiche produit complète (ou signale que le produit est introuvable).",
      input_schema: SUBMIT_PRODUCT_TOOL_SCHEMA,
    },
  ];
}

/**
 * Drive an Anthropic streaming call and yield typed progress events, then a terminal event.
 *
 * Progress mapping (best-effort, based on content_block_start events as they arrive):
 *  - 1st `server_tool_use` (web_search) → "search"
 *  - 2nd web_search → "specs"
 *  - 3rd web_search → "images"
 *  - `tool_use` for SUBMIT_TOOL_NAME start → "finalize"
 *
 * Terminal events:
 *  - `done` when submit_product input parses as full AiProductOutput
 *  - `not_found` when submit_product input is `{ not_found: true, reason }`
 *  - `error: invalid_ai_output` when submit_product input fails validation
 *  - `error: api_error` on network / timeout / malformed stream
 */
export async function* researchProduct(
  prompt: string,
  anthropic: Anthropic,
  opts: ResearchOptions = {},
): AsyncGenerator<ResearchProgress> {
  const model = opts.model ?? MODEL;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  let searchCount = 0;
  let finalizeEmitted = false;
  let submitInput: unknown = null;

  try {
    const stream = anthropic.messages.stream(
      {
        model,
        max_tokens: 8000,
        system: buildSystemPrompt(),
        tools: buildTools(),
        messages: [{ role: "user", content: prompt }],
      },
      { signal: ac.signal },
    );

    for await (const event of stream) {
      if (event.type !== "content_block_start") continue;
      const block = event.content_block;
      // server_tool_use (Anthropic-executed web_search) vs tool_use (our submit_product).
      if (block.type === "server_tool_use" && block.name === "web_search") {
        searchCount++;
        if (searchCount === 1) yield { type: "progress", step: "search" };
        else if (searchCount === 2) yield { type: "progress", step: "specs" };
        else if (searchCount === 3) yield { type: "progress", step: "images" };
      } else if (block.type === "tool_use" && block.name === SUBMIT_TOOL_NAME && !finalizeEmitted) {
        finalizeEmitted = true;
        yield { type: "progress", step: "finalize" };
      }
    }

    // After the stream completes, pull the fully-assembled message so we can read submit_product's input.
    const final = await stream.finalMessage();
    for (const block of final.content) {
      if (block.type === "tool_use" && block.name === SUBMIT_TOOL_NAME) {
        submitInput = block.input;
        break;
      }
    }

    if (submitInput === null) {
      yield { type: "error", code: "api_error" };
      return;
    }

    const parsed = parseAiToolInput(submitInput);
    if (parsed.kind === "ok") { yield { type: "done", output: parsed.output }; return; }
    if (parsed.kind === "not_found") { yield { type: "not_found", reason: parsed.reason }; return; }
    // Diagnostic: surface why submit_product input failed validation. Without this,
    // operators see "invalid_ai_output" with no way to tell which fields are wrong.
    console.error("[ai-product] invalid_ai_output", {
      issues: parsed.issues,
      submitInput: JSON.stringify(submitInput).slice(0, 4000),
    });
    yield { type: "error", code: "invalid_ai_output" };
  } catch (err) {
    console.error("[ai-product] researchProduct failed:", err);
    yield { type: "error", code: classifyError(err, ac.signal.aborted) };
  } finally {
    clearTimeout(timer);
  }
}

/** Map an Anthropic SDK / network error to a stable code the UI can translate. */
export function classifyError(err: unknown, aborted: boolean): ResearchErrorCode {
  if (aborted) return "timeout";
  const anyErr = err as { name?: string; status?: number; error?: { error?: { message?: string } } };
  if (anyErr?.name === "AbortError" || anyErr?.name === "APIUserAbortError") return "timeout";

  const status = anyErr?.status;
  const message = anyErr?.error?.error?.message ?? "";

  if (status === 401 || status === 403) return "auth_failed";
  if (status === 429) return "upstream_rate_limited";
  if (status === 400 && /credit|balance|billing/i.test(message)) return "no_credits";
  if (typeof status === "number" && status >= 500) return "upstream_unavailable";

  return "api_error";
}
