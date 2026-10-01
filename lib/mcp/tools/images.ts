import { searchImages, type ImageSearchResult } from "@/lib/media/image-search";
import { ok, fail, type McpErrorCode, type ToolResult } from "@/lib/mcp/result";
import { searchProductImagesShape } from "@/lib/validations/mcp-image";
import { defineTool, type ToolDefinition } from "./types";

/**
 * Outils d'images du MCP.
 *
 * `search_product_images` ne télécharge RIEN : elle montre au modèle à quoi
 * ressemble réellement le produit avant qu'il compose. L'attachement passe par
 * `add_product_images` (URL choisie par le modèle) ou par
 * `generate_product_image` (§ 4.2 du spec).
 */

type SearchFailure = Extract<ImageSearchResult, { ok: false }>["reason"];

/**
 * Chaque échec typé de `searchImages` garde son identité jusqu'au client.
 *
 * C'est la raison d'être de cet outil : replier `no_api_key` sur « aucune
 * image trouvée » enverrait le modèle chercher ailleurs pour une clé absente,
 * et personne ne saurait jamais qu'une clé manque. Le `Record` est exhaustif
 * par construction — ajouter une raison à `ImageSearchResult` sans la traduire
 * ici casse la compilation, au lieu de tomber dans un `default` muet.
 */
const SEARCH_FAILURES: Record<SearchFailure, { code: McpErrorCode; message: string }> = {
  no_api_key: {
    code: "internal_error",
    message:
      "Recherche d'images indisponible : le secret BRAVE_SEARCH_API_KEY n'est pas configuré sur ce déploiement. " +
      "Ce n'est pas « aucune image trouvée » — un administrateur doit poser ce secret " +
      "(npx wrangler secret put BRAVE_SEARCH_API_KEY).",
  },
  invalid_input: {
    code: "validation_error",
    message: "Requête de recherche invalide : au moins 2 caractères.",
  },
  auth_failed: {
    code: "internal_error",
    message:
      "Brave a refusé la clé BRAVE_SEARCH_API_KEY (401/403) : elle est expirée, révoquée ou sans droit sur " +
      "l'API Image Search. Un administrateur doit la renouveler.",
  },
  rate_limited: {
    code: "limit_exceeded",
    message: "Brave a répondu 429 : quota de recherche atteint. Réessayez plus tard.",
  },
  upstream_error: {
    code: "internal_error",
    message: "Brave a répondu une erreur serveur. Réessayez plus tard.",
  },
  parse_failed: {
    code: "internal_error",
    message: "Réponse illisible de Brave (200 mais corps non-JSON). Réessayez plus tard.",
  },
  timeout: {
    code: "internal_error",
    message: "Délai dépassé en interrogeant Brave. Réessayez.",
  },
  fetch_failed: {
    code: "internal_error",
    message: "Impossible de joindre Brave (réseau). Réessayez plus tard.",
  },
};

export const imageTools: ToolDefinition[] = [
  defineTool({
    name: "search_product_images",
    description:
      "Recherche des images de référence sur le web (Brave Image Search) pour voir à quoi ressemble réellement un " +
      "produit avant d'en rédiger la fiche ou d'en composer un visuel. NE TÉLÉCHARGE RIEN et n'attache rien : " +
      "la réponse donne des URL directes d'images avec leur domaine source, à toi de juger lesquelles montrent " +
      "bien le produit (préfère le site du fabricant). Pour attacher une de ces images, appelle " +
      "add_product_images avec son url ; pour composer un visuel autour d'une photo déjà attachée, " +
      "generate_product_image. Une liste vide signifie « aucune image trouvée » ; une clé absente ou refusée " +
      "est une erreur, pas une liste vide.",
    inputSchema: searchProductImagesShape,
    handler: async (_ctx, input): Promise<ToolResult> => {
      let result: ImageSearchResult;
      try {
        result = await searchImages({ query: input.query, count: input.count });
      } catch (err) {
        // `searchImages` ne devrait jamais lever (elle normalise tout en
        // échec typé) ; si elle le fait, aucune trace de pile ne sort d'ici.
        console.error("[mcp/search_product_images]", err);
        return fail("internal_error", "Erreur interne pendant la recherche d'images.");
      }

      if (!result.ok) {
        const { code, message } = SEARCH_FAILURES[result.reason];
        return fail(code, message);
      }

      return ok({
        query: input.query,
        count: result.results.length,
        results: result.results,
        ...(result.results.length === 0
          ? { message: "Aucune image trouvée pour cette requête : reformule-la (marque + modèle exact) ou cherche autrement." }
          : {}),
      });
    },
  }),
];
