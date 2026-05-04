import type Anthropic from "@anthropic-ai/sdk";
import type { ImageSearchResultItem } from "@/lib/ai/image-search";

/**
 * Vision-based filtering pass over image_search candidates.
 *
 * Brave returns the URLs that text-based filtering (title + source_domain)
 * can't catch the watermarks, fine-print logos, surimprime­d text, banner
 * overlays embedded *in the pixels*. This pass sends each thumbnail to
 * Claude with vision and asks for a per-image keep/reject decision.
 *
 * Cost (Sonnet 4.6, ~10 thumbnails @ ~330 tokens each + prompt):
 *   ~3-5k input tokens + ~100 output tokens ≈ $0.005-0.01 per generation.
 *
 * Latency: +3-6s in the typical case (single non-streaming call).
 *
 * Failure mode is graceful: if the vision call throws or times out, the
 * caller keeps the unfiltered Brave results — better to ship some
 * watermarked images than to drop the whole tool_result back to the model.
 */

const FILTER_TOOL_NAME = "report_filtering";
const DEFAULT_TIMEOUT_MS = 30_000;
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
  if (inspectable.length === 0) return candidates;

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
        model: opts.model ?? "claude-sonnet-4-6",
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
      console.warn("[vision-filter] no tool_use in response — keeping all candidates");
      return candidates;
    }

    const input = toolUse.input as { keep_indexes?: unknown };
    if (!Array.isArray(input.keep_indexes)) {
      console.warn("[vision-filter] keep_indexes missing or not array — keeping all candidates");
      return candidates;
    }
    const keepSet = new Set(
      input.keep_indexes.filter((n): n is number => Number.isInteger(n) && n >= 0),
    );

    // Translate display indexes → original candidate indexes, preserving
    // candidates that had no thumbnail (we never asked Claude about those).
    const noThumbIndexes = new Set(
      candidates.map((c, i) => (c.thumbnail_url ? -1 : i)).filter((i) => i >= 0),
    );
    const keptOriginalIndexes = new Set<number>();
    inspectable.forEach((x, displayIdx) => {
      if (keepSet.has(displayIdx)) keptOriginalIndexes.add(x.i);
    });

    const filtered = candidates.filter((_, i) => keptOriginalIndexes.has(i) || noThumbIndexes.has(i));

    console.log("[vision-filter] kept %d/%d candidates (%d untestable kept by default)",
      filtered.length, candidates.length, noThumbIndexes.size);

    return filtered;
  } catch (err) {
    console.warn("[vision-filter] failed, keeping unfiltered Brave results:", err);
    return candidates;
  } finally {
    clearTimeout(timer);
  }
}
