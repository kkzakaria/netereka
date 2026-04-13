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
- Lister les catégories de produits
- Gérer le panier (ajouter, voir, modifier, supprimer, vider)
- Afficher les zones et frais de livraison
- Transférer à un conseiller humain si nécessaire`;

  if (isVerified) {
    return `${base}
- Passer des commandes à partir du panier
- Suivre le statut d'une commande
- Voir l'historique des commandes

PROCESSUS DE COMMANDE:
1. Le client ajoute des articles au panier
2. Le client demande à commander
3. Tu demandes l'adresse de livraison, la commune et le téléphone
4. Tu vérifies la zone de livraison et le montant
5. Tu confirmes la commande avec create_order`;
  }

  return `${base}

COMPTE NON LIÉ:
Le client n'a pas encore lié son compte NETEREKA. Il peut parcourir le catalogue, ajouter au panier et poser des questions.
Pour commander, il doit d'abord lier son compte via son email NETEREKA (un code de vérification sera envoyé).
Propose la liaison de compte quand le client essaie de commander.`;
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
