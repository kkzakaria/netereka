import type Anthropic from "@anthropic-ai/sdk";
import type { ImageSearchResultItem } from "@/lib/ai/image-search";
import { MODEL } from "@/lib/ai/product-research";

/**
 * Vision-based filtering pass over image_search candidates.
 *
 * Brave returns URLs that text-based filtering (title + source_domain) can't
 * reliably vet — watermarks, fine-print logos, overlaid text, banner overlays
 * are embedded in the pixels themselves. This pass sends each thumbnail to
 * Claude with vision and asks for a per-image keep/reject decision.
 *
 * Cost (as of 2026-05, Sonnet 4.6 @ $3/M input + $15/M output) for ~10
 * thumbnails: ~3-5k input tokens + ~100 output tokens ≈ $0.01-0.02/generation.
 *
 * Latency: typically +3-6s (single non-streaming call). Anthropic fetches the
 * thumbnail URLs server-side, so a slow Brave CDN can dominate latency.
 *
 * Failure mode is graceful: if the vision call throws or times out, the
 * caller keeps the unfiltered Brave results — better to ship some
 * watermarked images than to drop the whole tool_result back to the model.
 */

const FILTER_TOOL_NAME = "report_filtering";

// Generous: vision is typically 1-3s, but Anthropic's URL-fetch path can stall
// on slow CDNs. Stays well under the 120s outer-loop ceiling so an image_search
// → tool_result round can complete inside the research budget.
const DEFAULT_TIMEOUT_MS = 30_000;

// `keep_indexes: [0..9]` is ~30 tokens; 256 leaves ample headroom for the
// tool-use envelope and longer arrays if MAX_COUNT in image-search.ts grows.
const MAX_OUTPUT_TOKENS = 256;

const SYSTEM_PROMPT = [
  "Tu filtres des images candidates pour une fiche produit e-commerce.",
  "Pour CHAQUE image numérotée, juge si elle est utilisable comme image de catalogue.",
  "GARDER (utilisable) :",
  "- Photo produit propre, fond blanc/neutre/transparent, produit isolé.",
  "- Image officielle constructeur (newsroom, presse studio).",
  "- Photo packaging officielle.",
  "- Vue produit dans contexte d'usage neutre, sans branding lourd.",
  "REJETER (non utilisable) :",
  "- Watermark ou logo de site web visible (Tom's Guide, Engadget, GSMArena, 91mobiles, etc., même très fin).",
  "- Texte surimprimé : prix, slogan, badge promo, \"Top 10\", \"vs\", \"review\".",
  "- Bannière publicitaire ou capture d'écran d'un site e-commerce.",
  "- Comparatif multi-produits (plusieurs appareils côte à côte).",
  "- Schémas, exploded views, leaks/concepts non confirmés.",
  "- Mèmes, thumbnails YouTube clickbait.",
  "Renvoie via le tool report_filtering la liste des INDEX (0-based) à GARDER.",
  "Si rien n'est utilisable, retourne un tableau vide.",
].join("\n");

const FILTER_TOOL: Anthropic.Tool = {
  name: FILTER_TOOL_NAME,
  description: "Indique quelles images garder pour le catalogue produit.",
  input_schema: {
    type: "object",
    required: ["keep_indexes"],
    additionalProperties: false,
    properties: {
      keep_indexes: {
        type: "array",
        items: { type: "integer", minimum: 0 },
        description:
          "Index 0-based des images à garder. Tableau vide si aucune n'est utilisable.",
      },
    },
  },
};

export interface VisionFilterOptions {
  model?: string;
  timeoutMs?: number;
}

/**
 * Classify a thrown Anthropic SDK error into a stable category for logging.
 * Same shape conventions as `classifyError` in product-research.ts but
 * inlined here to avoid a circular import.
 */
function classifyVisionError(err: unknown, aborted: boolean): string {
  const e = err as { name?: string; status?: number; message?: string };
  if (aborted) return "timeout";
  if (e?.name === "AbortError" || e?.name === "APIUserAbortError") return "timeout";
  if (e?.status === 401 || e?.status === 403) return "auth_failed";
  if (e?.status === 429) return "rate_limited";
  if (typeof e?.status === "number" && e.status >= 500) return "upstream_unavailable";
  return "unknown";
}

/**
 * Filter candidates by sending each thumbnail to Claude vision. Returns the
 * subset Claude flagged as keepable. On any failure, returns the original list
 * unchanged so the upstream tool_result still reaches the model.
 */
export async function filterByVision(
  candidates: ImageSearchResultItem[],
  anthropic: Anthropic,
  opts: VisionFilterOptions = {},
): Promise<ImageSearchResultItem[]> {
  if (candidates.length === 0) return candidates;

  // Only candidates with a thumbnail_url can be inspected — Brave occasionally
  // returns a result with properties.url but no thumbnail. For those, we can't
  // run vision — keep them in the output so we don't silently drop them.
  const inspectable = candidates
    .map((c, i) => ({ c, i, thumb: c.thumbnail_url }))
    .filter((x): x is { c: ImageSearchResultItem; i: number; thumb: string } => !!x.thumb);
  if (inspectable.length === 0) {
    console.warn(
      "[vision-filter] no inspectable thumbnails (Brave returned %d items, none with thumbnail_url) — skipping vision pass",
      candidates.length,
    );
    return candidates;
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const userContent: Anthropic.ContentBlockParam[] = [];
    inspectable.forEach((x, displayIdx) => {
      userContent.push({ type: "text", text: `Image ${displayIdx} (${x.c.source_domain}) — ${x.c.title || "sans titre"}` });
      userContent.push({
        type: "image",
        source: { type: "url", url: x.thumb },
      });
    });

    const response = await anthropic.messages.create(
      {
        model: opts.model ?? MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM_PROMPT,
        tools: [FILTER_TOOL],
        tool_choice: { type: "tool", name: FILTER_TOOL_NAME },
        messages: [{ role: "user", content: userContent }],
      },
      { signal: ac.signal },
    );

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === FILTER_TOOL_NAME,
    );
    if (!toolUse) {
      // tool_choice forced the model toward our tool, so a missing tool_use
      // here is either a max_tokens cap or a model refusal — both are code
      // defects worth surfacing with full context.
      console.warn("[vision-filter] no matching tool_use in response — keeping all candidates", {
        stop_reason: response.stop_reason,
        block_types: response.content.map((b) => b.type),
        tool_names: response.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map((b) => b.name),
      });
      return candidates;
    }

    const input = toolUse.input as { keep_indexes?: unknown };
    if (!Array.isArray(input.keep_indexes)) {
      console.warn("[vision-filter] keep_indexes missing or not array — keeping all candidates");
      return candidates;
    }
    const rawIndexes = input.keep_indexes;
    const validIndexes = rawIndexes.filter(
      (n): n is number => Number.isInteger(n) && n >= 0 && n < inspectable.length,
    );
    if (validIndexes.length !== rawIndexes.length) {
      console.warn(
        "[vision-filter] dropped %d invalid keep_indexes (input had %d, %d valid)",
        rawIndexes.length - validIndexes.length,
        rawIndexes.length,
        validIndexes.length,
        { raw: rawIndexes },
      );
    }
    const keepSet = new Set(validIndexes);

    // Translate display indexes → original candidate indexes, preserving
    // candidates that had no thumbnail (we never asked Claude about those).
    // e.g. candidates [A, B(noThumb), C] where Claude sees [A, C] as displayIdx
    // [0, 1]; keep_indexes:[1] → keptOriginalIndexes:{2}; B is preserved by
    // noThumbIndexes:{1}.
    const filtered = candidates.filter((c, i) => {
      if (!c.thumbnail_url) return true; // no-thumb pass-through
      const displayIdx = inspectable.findIndex((x) => x.i === i);
      return displayIdx !== -1 && keepSet.has(displayIdx);
    });

    if (filtered.length === 0 && candidates.length > 0) {
      // Vision rejected EVERY candidate — usually a sign the prompt is too
      // aggressive or the model regressed on this query class. Worth a louder
      // signal than the routine "kept N/M" log so prompt regressions surface.
      console.warn(
        "[vision-filter] rejected ALL candidates (0/%d kept) — possible prompt regression",
        candidates.length,
      );
    } else {
      const inspectedKept = filtered.filter((c) => c.thumbnail_url).length;
      const passthrough = filtered.length - inspectedKept;
      console.log(
        "[vision-filter] kept %d/%d candidates (%d inspected, %d untestable kept by default)",
        filtered.length, candidates.length, inspectedKept, passthrough,
      );
    }

    return filtered;
  } catch (err) {
    const reason = classifyVisionError(err, ac.signal.aborted);
    const e = err as { name?: string; status?: number; message?: string };
    console.warn("[vision-filter] failed, keeping unfiltered Brave results", {
      reason,
      err_name: e?.name,
      err_status: e?.status,
      err_message: e?.message,
    });
    return candidates;
  } finally {
    clearTimeout(timer);
  }
}
