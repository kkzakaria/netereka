import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { McpContext } from "@/lib/mcp/context";
import { bannerTools } from "@/lib/mcp/tools/banners";
import { categoryTools } from "@/lib/mcp/tools/categories";
import { imageTools } from "@/lib/mcp/tools/images";
import { productTools } from "@/lib/mcp/tools/products";
import type { ToolDefinition } from "@/lib/mcp/tools/types";

export const MCP_SERVER_NAME = "netereka-admin";
export const MCP_SERVER_VERSION = "1.0.0";

export const ALL_TOOLS: ToolDefinition[] = [...categoryTools, ...productTools, ...bannerTools, ...imageTools];

/**
 * One server per request (stateless transport) bound to the admin who owns
 * the OAuth token. Tools never see the token, only the resolved context.
 */

/**
 * Le message d'un champ inconnu, qui NOMME les champs utilisables.
 *
 * Les champs déclarés en `z.never()` en sont exclus, et c'est tout l'intérêt
 * de cette fonction : les cinq noms Story (`story`, `tagline`, `highlights`,
 * `feature_blocks`, `faq`) figurent dans la forme pour pouvoir être refusés
 * avec un message qui nomme leur remplaçant. Les lister comme « acceptés »
 * enverrait l'appelant droit vers un second refus — le contraire du service
 * rendu. Mesuré sur les vingt outils avant d'écrire cette ligne : trois d'entre
 * eux auraient annoncé cinq champs refusés.
 */
function refusDeCleInconnue(shape: Readonly<Record<string, unknown>>): string {
  const utilisables = Object.entries(shape)
    .filter(([, schema]) => !estRefuse((schema as { def?: unknown }).def))
    .map(([nom]) => nom)
    .sort();
  return utilisables.length === 0
    ? "Champ inconnu. Cet outil n'accepte aucun champ."
    : `Champ inconnu. Cet outil n'accepte que : ${utilisables.join(", ")}.`;
}

/**
 * Un `z.never()`, nu ou enveloppé dans un `.optional()`. Lecture de la
 * définition interne de Zod plutôt que du type public : c'est la seule façon de
 * distinguer un champ déclaré-pour-être-refusé d'un champ ordinaire, et elle
 * est bornée à cette fonction.
 */
function estRefuse(def: unknown): boolean {
  if (typeof def !== "object" || def === null) return false;
  const d = def as { type?: unknown; innerType?: { def?: unknown } };
  if (d.type === "never") return true;
  return d.innerType ? estRefuse(d.innerType.def) : false;
}

export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });
  for (const tool of ALL_TOOLS) {
    server.registerTool(
      tool.name,
      // Le SDK v2 veut un schéma objet ; les outils déclarent une forme brute
      // (voir lib/mcp/tools/types.ts). L'adaptation se fait ici, une seule fois,
      // plutôt que dans les vingt définitions.
      //
      // STRICT, et c'est le correctif d'un défaut vu en service le 2026-10-02.
      // Un `z.object` ÉLAGUE les clés inconnues au lieu de les refuser : un
      // assistant a écrit `base_price: 35000`, reçu un SUCCÈS, et le prix est
      // resté à 0. Il a recommencé sous trois autres formes, toutes « réussies »,
      // avant de recharger la définition de l'outil pour découvrir que le champ
      // s'appelle `pricing.base_price`. Quatre écritures vides annoncées comme
      // des écritures.
      //
      // Le contrat du lot B avait fermé ce silence pour cinq noms seulement
      // (les champs Story, par `z.never()` avec un message qui nomme leur
      // remplaçant). Ces messages-là survivent : un champ DÉCLARÉ reste un champ
      // connu. Ce qui change, c'est tout le reste — une faute de frappe, un nom
      // d'une autre API, un champ imaginé.
      //
      // Le message liste les champs acceptés, parce que refuser sans dire quoi
      // employer ne fait que déplacer les quatre essais à l'aveugle.
      {
        description: tool.description,
        // Même forme fonctionnelle que `objetStrict` : une chaîne s'appliquerait
        // aussi à l'`invalid_type` de la racine. Inatteignable ici — le SDK
        // refuse un `arguments` non-objet avant d'arriver au schéma de l'outil —
        // mais la symétrie évite que le prochain qui copie ce bloc hérite du
        // piège que les objets imbriqués, eux, ont réellement subi.
        inputSchema: z.strictObject(tool.inputSchema, {
          error: (iss) => (iss.code === "unrecognized_keys" ? refusDeCleInconnue(tool.inputSchema) : undefined),
        }),
      },
      async (input) => tool.handler(ctx, input),
    );
  }
  return server;
}
