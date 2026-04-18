import type Anthropic from "@anthropic-ai/sdk";
import { parseAiToolInput, type AiProductOutput } from "@/lib/validations/product-ai";
import { HIGHLIGHT_ICON_NAMES } from "@/lib/validations/product-story";

export type ResearchProgress =
  | { type: "progress"; step: "search" | "specs" | "images" | "finalize" }
  | { type: "done"; output: AiProductOutput }
  | { type: "not_found"; reason: string }
  | { type: "error"; code: "invalid_ai_output" | "api_error" | "feature_disabled" };

export const MODEL = "claude-sonnet-4-6";

export const SUBMIT_TOOL_NAME = "submit_product";

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
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5,
    } as unknown as Anthropic.Tool,
    {
      name: SUBMIT_TOOL_NAME,
      description: "Soumet la fiche produit complète (ou signale que le produit est introuvable).",
      input_schema: {
        type: "object",
        additionalProperties: true,
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

  yield { type: "error", code: "api_error" };
}
