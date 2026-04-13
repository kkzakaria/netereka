import type { ChatMessage, ToolCall } from "./types";
import { TOOL_DEFINITIONS } from "./tools/registry";

const MODEL = "@cf/google/gemma-3-27b-it";

export type LLMResponse =
  | { type: "text"; content: string }
  | { type: "tool_call"; toolCalls: ToolCall[] };

export function buildSystemPrompt(isVerified: boolean): string {
  const base = `Tu es l'assistant commercial de NETEREKA Electronic, une boutique en ligne d'électronique en Côte d'Ivoire.

RÈGLES:
- Réponds toujours en français, sauf si le client écrit en anglais
- Monnaie: XOF (FCFA). Affiche les prix avec le format "XXX XXX FCFA"
- Paiement: à la livraison uniquement (cash on delivery)
- Sois professionnel, amical et concis — messages courts adaptés à WhatsApp
- Utilise *gras* pour les noms de produits et les prix
- Maximum 1-2 emojis par message
- Ne réponds qu'aux sujets liés à NETEREKA et ses produits
- Si tu ne connais pas la réponse, propose de transférer à un conseiller

CAPACITÉS:
- Rechercher des produits dans le catalogue
- Afficher les détails d'un produit (prix, stock, variantes)
- Lister les catégories de produits`;

  if (isVerified) {
    return `${base}
- Passer des commandes et suivre leur statut (le client a un compte lié)
- Le client peut commander directement via cette conversation`;
  }

  return `${base}

COMPTE NON LIÉ:
Le client n'a pas encore lié son compte NETEREKA. Il peut parcourir le catalogue et poser des questions.
Pour commander, il doit d'abord lier son compte. Mentionne-le gentiment si le client essaie de commander.`;
}

export async function callLLM(
  ai: Ai,
  messages: ChatMessage[],
  isVerified: boolean
): Promise<LLMResponse> {
  const systemPrompt = buildSystemPrompt(isVerified);

  const aiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant" | "tool",
      content: m.content,
      ...(m.name ? { name: m.name } : {}),
    })),
  ];

  const response = (await ai.run(MODEL, {
    messages: aiMessages,
    tools: TOOL_DEFINITIONS,
  })) as { response?: string; tool_calls?: ToolCall[] };

  if (response.tool_calls && response.tool_calls.length > 0) {
    return { type: "tool_call", toolCalls: response.tool_calls };
  }

  return { type: "text", content: response.response ?? "Désolé, je n'ai pas pu traiter votre message." };
}
