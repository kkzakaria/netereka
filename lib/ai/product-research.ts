import type Anthropic from "@anthropic-ai/sdk";
import { parseAiToolInput, type AiProductOutput } from "@/lib/validations/product-ai";
import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";
import { SUBMIT_PRODUCT_TOOL_SCHEMA } from "@/lib/ai/submit-tool-schema";
import { searchImages, type ImageSearchInput } from "@/lib/ai/image-search";

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

/** Hard budget for the Anthropic call. With the tool-use loop (web_search + image_search round-trips), end-to-end can run 30-90s; 120s is a generous ceiling. */
export const DEFAULT_TIMEOUT_MS = 120_000;

/** Cap to prevent runaway tool-use loops if the model never reaches submit_product. */
const MAX_LOOP_ITERATIONS = 8;

export const SUBMIT_TOOL_NAME = "submit_product";
export const IMAGE_SEARCH_TOOL_NAME = "image_search";

export interface ResearchOptions {
  model?: string;
  timeoutMs?: number;
  /** Brave Search API key. When null, image_search returns reason:"no_api_key" and the model is expected to emit image_candidates: []. */
  braveApiKey?: string | null;
}

export function buildSystemPrompt(opts: { hasImageSearch: boolean } = { hasImageSearch: true }): string {
  const icons = HIGHLIGHT_ICON_NAMES.join(", ");
  const lines = [
    "Tu es rédacteur catalogue pour une boutique d'électronique en Côte d'Ivoire.",
    "Réponds TOUJOURS en français. Ne parle jamais à l'utilisateur : tes seules sorties doivent être l'utilisation des outils.",
    "Étapes :",
    "1. Utilise web_search pour vérifier l'existence du produit, ses spécifications officielles.",
    opts.hasImageSearch
      ? "2. Utilise image_search (1 à 3 requêtes ciblées en anglais : `\"<modèle> product photo\"`, `\"<modèle> press render\"`, `\"<modèle> packaging\"`) pour récolter des candidats images. FILTRE rigoureusement les résultats avant de les inclure (voir Règles)."
      : "2. (image_search non disponible — renvoie image_candidates: [].)",
    "3. Si le produit est introuvable ou trop ambigu, appelle submit_product avec { \"not_found\": true, \"reason\": \"…\" }.",
    "4. Sinon, appelle submit_product avec une fiche complète.",
    "Règles :",
    "- Respecte STRICTEMENT le schéma JSON du tool submit_product (champs, nesting, types). En cas de doute, omets le champ.",
    "- N'invente aucune caractéristique. Omets plutôt.",
    "- Ne génère PAS de prix ni de stock (ne sont pas dans le schéma).",
    "- short_description est un RÉSUMÉ court (≤120 caractères), pas une description complète. La description longue va dans description_html.",
    "- tagline, highlights, feature_blocks, faq sont nestés sous story (ex : { story: { tagline, highlights: [...] } }).",
    "- Pour chaque highlight, choisis une icône parmi cette liste exacte : " + icons + ".",
    "- Les descriptions suivent un style Apple : tagline courte et percutante, highlights concis, feature_blocks éditoriaux avec un titre et un corps de 1-2 paragraphes.",
    "",
    "Filtrage des images (CRITIQUE — la qualité du catalogue dépend de ce tri) :",
    "- N'INVENTE JAMAIS d'URLs. Inclus UNIQUEMENT des URLs reçues telles quelles dans les résultats image_search/web_search (copier-coller exact, jamais reconstruire un pattern ni deviner un slug).",
    "- GARDER : photo produit isolé sur fond blanc/neutre/transparent, image officielle constructeur (newsroom, presse), photo studio, packaging officiel, vues 360° du produit seul.",
    "- REJETER : bannières publicitaires (prix surimprimé, slogan, badge promo), listicles (\"Top 10…\", \"Best of…\"), comparatifs multi-produits (plusieurs téléphones côte à côte), captures d'écran de boutiques en ligne, photos d'usage avec branding lourd (femme souriant tenant le produit + logo de site), images avec watermark/logo de site (Tom's Guide, Engadget, GSMArena tag dans le coin), thumbnails YouTube, mèmes, leaks/concepts non confirmés, schémas et exploded views, photos de boîtes ouvertes pleines d'accessoires.",
    "- Évalue chaque image via son `title` et `source_domain`. Si `title` mentionne \"vs\", \"top\", \"best\", \"comparison\", \"deal\", \"review roundup\", \"hands-on\" : SKIP. Si `source_domain` est un constructeur officiel, un site presse spécialisé reconnu (theverge.com, gsmarena.com pages produit, anandtech.com), ou Wikipedia/Wikimedia : généralement OK.",
    "- Cible 4-8 images de qualité catalogue. Si tu n'en trouves pas assez après filtrage, retourne moins (ou `image_candidates: []`). Mieux vaut 0 image qu'une bannière promo.",
    "- Format des entrées : { url, source_domain, alt? }. Privilégie images directes (jpg/png/webp).",
  ];
  return lines.join("\n");
}

export function buildTools(opts: { hasImageSearch: boolean } = { hasImageSearch: true }): Anthropic.ToolUnion[] {
  const tools: Anthropic.ToolUnion[] = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5,
    },
  ];
  if (opts.hasImageSearch) {
    tools.push({
      name: IMAGE_SEARCH_TOOL_NAME,
      description:
        "Recherche d'images web pour un produit donné. Retourne jusqu'à 20 candidats avec url directe, source_domain, title et thumbnail. À utiliser plusieurs fois avec des requêtes ciblées (anglais de préférence) puis filtrer rigoureusement.",
      input_schema: {
        type: "object",
        required: ["query"],
        additionalProperties: false,
        properties: {
          query: {
            type: "string",
            minLength: 2,
            maxLength: 200,
            description: "Requête en anglais de préférence (ex: 'iPhone 15 Pro product photo official').",
          },
          count: {
            type: "integer",
            minimum: 1,
            maximum: 20,
            description: "Nombre de résultats demandés (défaut 10).",
          },
        },
      },
    });
  }
  tools.push({
    name: SUBMIT_TOOL_NAME,
    description: "Soumet la fiche produit complète (ou signale que le produit est introuvable).",
    input_schema: SUBMIT_PRODUCT_TOOL_SCHEMA,
  });
  return tools;
}

/**
 * Drive an Anthropic streaming call with a tool-use loop, yielding typed progress events
 * and a terminal event.
 *
 * Loop:
 *  - Stream a turn. As content blocks start, yield progress events.
 *  - At end of turn, if stop_reason="tool_use", execute every client tool (image_search)
 *    and append a tool_result message. If submit_product is in the turn, capture its input
 *    and exit the loop. Repeat (up to MAX_LOOP_ITERATIONS).
 *
 * Progress mapping (best-effort):
 *  - 1st web_search → "search"
 *  - 2nd web_search → "specs"
 *  - 1st image_search → "images" (overrides "specs" if it comes first)
 *  - submit_product start → "finalize"
 */
export async function* researchProduct(
  prompt: string,
  anthropic: Anthropic,
  opts: ResearchOptions = {},
): AsyncGenerator<ResearchProgress> {
  const model = opts.model ?? MODEL;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const braveApiKey = opts.braveApiKey ?? null;
  const hasImageSearch = !!braveApiKey;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  let webSearchCount = 0;
  let imagesEmitted = false;
  let finalizeEmitted = false;
  let submitInput: unknown = null;

  const tools = buildTools({ hasImageSearch });
  const system = buildSystemPrompt({ hasImageSearch });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  try {
    for (let iter = 0; iter < MAX_LOOP_ITERATIONS; iter++) {
      const stream = anthropic.messages.stream(
        {
          model,
          max_tokens: 8000,
          system,
          tools,
          messages,
        },
        { signal: ac.signal },
      );

      for await (const event of stream) {
        if (event.type !== "content_block_start") continue;
        const block = event.content_block;
        if (block.type === "server_tool_use" && block.name === "web_search") {
          webSearchCount++;
          if (webSearchCount === 1) yield { type: "progress", step: "search" };
          else if (webSearchCount === 2) yield { type: "progress", step: "specs" };
        } else if (block.type === "tool_use" && block.name === IMAGE_SEARCH_TOOL_NAME && !imagesEmitted) {
          imagesEmitted = true;
          yield { type: "progress", step: "images" };
        } else if (block.type === "tool_use" && block.name === SUBMIT_TOOL_NAME && !finalizeEmitted) {
          finalizeEmitted = true;
          yield { type: "progress", step: "finalize" };
        }
      }

      const final = await stream.finalMessage();
      messages.push({ role: "assistant", content: final.content });

      // Capture submit_product if present — that's terminal regardless of stop_reason.
      const submitBlock = final.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === SUBMIT_TOOL_NAME,
      );
      if (submitBlock) {
        submitInput = submitBlock.input;
        break;
      }

      if (final.stop_reason !== "tool_use") {
        // Model stopped without calling submit_product — most often max_tokens or end_turn
        // after a refusal. Surface as api_error so the UI shows a generic retry message.
        console.error("[ai-product] stream ended without submit_product", { stop_reason: final.stop_reason });
        yield { type: "error", code: "api_error" };
        return;
      }

      // Run client tools (image_search). server_tool_use blocks (web_search) are already
      // resolved by Anthropic — don't echo them back as tool_results.
      const clientToolUses = final.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === IMAGE_SEARCH_TOOL_NAME,
      );
      if (clientToolUses.length === 0) {
        // stop_reason=tool_use but no client tool to run — should be impossible (submit_product
        // was checked above). Defensive bail-out.
        console.error("[ai-product] tool_use stop without client-runnable tool");
        yield { type: "error", code: "api_error" };
        return;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        clientToolUses.map(async (tu): Promise<Anthropic.ToolResultBlockParam> => {
          try {
            const result = await searchImages(tu.input as ImageSearchInput, braveApiKey);
            return {
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify(result),
              is_error: !result.ok,
            };
          } catch (err) {
            console.error("[ai-product] image_search threw", err);
            return {
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify({ ok: false, reason: "fetch_failed" }),
              is_error: true,
            };
          }
        }),
      );

      messages.push({ role: "user", content: toolResults });
    }

    if (submitInput === null) {
      console.error("[ai-product] hit MAX_LOOP_ITERATIONS without submit_product");
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
