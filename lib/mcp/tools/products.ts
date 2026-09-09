import {
  type DraftAudit,
  DraftError,
  addImagesFromUrls,
  createDraft,
  deleteDraft,
  getDraft,
  removeImage,
  searchProducts,
  setColorVariants,
  updateDraft,
} from "@/lib/db/product-drafts";
import type { McpContext } from "@/lib/mcp/context";
import { ok, fail, type ToolResult } from "@/lib/mcp/result";
import {
  addImagesSchema,
  createDraftSchema,
  idSchema,
  searchProductsSchema,
  setVariantsSchema,
  updateDraftSchema,
} from "@/lib/validations/mcp-product";
import { defineTool, type ToolDefinition } from "./types";

/**
 * Product-draft tools. Every write goes through lib/db/product-drafts.ts,
 * which refuses anything that is not `is_draft = 1` and commits the audit row
 * in the same D1 batch as the mutation. Publishing stays in the admin wizard
 * (/products/<id>/edit) — no tool here can flip is_draft/is_active.
 */

function toolError(toolName: string, err: unknown): ToolResult {
  if (err instanceof DraftError) return fail(err.code, err.message);
  console.error(`[mcp/${toolName}]`, err);
  return fail("internal_error", "Erreur interne, réessayez ou contactez un administrateur");
}

/** Attribution recorded with the write: the admin behind the token and the OAuth client. */
function auditFor(ctx: McpContext, tool: string): DraftAudit {
  return { actor: { id: ctx.user.id, name: ctx.user.name }, details: { via: "mcp", tool, client_id: ctx.clientId } };
}

const DESCRIPTION_RULES =
  "Champs : name (requis), category_id (requis, voir list_categories), brand, short_description (≤120), description_html (HTML, assaini côté serveur), story {tagline, highlights[3-6] {icon,label}, feature_blocks[2-4] {title,body}, faq[≤5] {question,answer}}, seo {meta_title ≤60, meta_description ≤160}, attributes {colors[{name,hex}], dimensions {length_mm,height_mm,width_mm,weight_g}, specs[{name,value}]}, pricing {base_price, compare_price, sku, stock_quantity, low_stock_threshold, weight_grams} (prix en XOF entiers).";

export const productTools: ToolDefinition[] = [
  defineTool({
    name: "search_products",
    description:
      "Recherche des produits (brouillons et publiés) par nom, slug ou SKU. À appeler avant create_product_draft pour éviter les doublons.",
    inputSchema: searchProductsSchema.shape,
    handler: async (_ctx, input) => {
      try {
        return ok(await searchProducts(input.query, input.limit));
      } catch (err) {
        return toolError("search_products", err);
      }
    },
  }),

  defineTool({
    name: "get_product_draft",
    description: "Relit un brouillon complet : champs, attributs, images (URL publiques), variantes. Échoue sur un produit publié.",
    inputSchema: { id: idSchema },
    handler: async (_ctx, input) => {
      try {
        return ok(await getDraft(input.id));
      } catch (err) {
        return toolError("get_product_draft", err);
      }
    },
  }),

  defineTool({
    name: "create_product_draft",
    description:
      `Crée un brouillon produit (non publié, invisible en boutique). Retourne {id, slug, edit_url}. ${DESCRIPTION_RULES} Les couleurs déclarées ici doivent correspondre à celles de set_product_variants.`,
    inputSchema: createDraftSchema.shape,
    handler: async (ctx, input) => {
      try {
        const { id, slug } = await createDraft(input, auditFor(ctx, "create_product_draft"));
        return ok({ id, slug, edit_url: `/products/${id}/edit` });
      } catch (err) {
        return toolError("create_product_draft", err);
      }
    },
  }),

  defineTool({
    name: "update_product_draft",
    description:
      `Met à jour un brouillon. Champs absents ignorés, null efface. attributes fourni remplace tous les attributs : colors, dimensions et specs sont alors tous requis (relire le brouillon avant pour ne rien perdre). slug optionnel (unique). ${DESCRIPTION_RULES}`,
    inputSchema: { id: idSchema, ...updateDraftSchema.shape },
    handler: async (ctx, input) => {
      try {
        const { id, ...patch } = input;
        const result = await updateDraft(id, patch, auditFor(ctx, "update_product_draft"));
        return ok(result);
      } catch (err) {
        return toolError("update_product_draft", err);
      }
    },
  }),

  defineTool({
    name: "add_product_images",
    description:
      "Télécharge 1 à 8 images depuis des URL http(s) (≤5 Mo chacune, 12 max par produit) vers le stockage de la boutique et les attache au brouillon. Succès partiel possible : vérifier results[].ok (reason limit_exceeded si le quota a été atteint entre-temps). La première image du produit devient l'image principale.",
    inputSchema: { id: idSchema, ...addImagesSchema.shape },
    handler: async (ctx, input) => {
      try {
        return ok(await addImagesFromUrls(input.id, input.images, auditFor(ctx, "add_product_images")));
      } catch (err) {
        return toolError("add_product_images", err);
      }
    },
  }),

  defineTool({
    name: "remove_product_image",
    description: "Retire une image d'un brouillon (ligne et fichier). Si elle était principale, la suivante le devient.",
    inputSchema: { id: idSchema, image_id: idSchema },
    handler: async (ctx, input) => {
      try {
        await removeImage(input.id, input.image_id, auditFor(ctx, "remove_product_image"));
        return ok({ removed: true });
      } catch (err) {
        return toolError("remove_product_image", err);
      }
    },
  }),

  defineTool({
    name: "set_product_variants",
    description:
      "Définit les variantes couleur d'un brouillon (remplace l'ensemble). price absent ou uniform_price=true → prix de base du produit. Les variantes retirées sont supprimées. Le stock du produit devient la somme des stocks. Déclarer les mêmes couleurs dans attributes.colors.",
    inputSchema: { id: idSchema, ...setVariantsSchema.shape },
    handler: async (ctx, input) => {
      try {
        const { id, ...rest } = input;
        const result = await setColorVariants(id, rest, auditFor(ctx, "set_product_variants"));
        return ok(result);
      } catch (err) {
        return toolError("set_product_variants", err);
      }
    },
  }),

  defineTool({
    name: "delete_product_draft",
    description: "Supprime définitivement un brouillon et ses images. Impossible sur un produit publié.",
    inputSchema: { id: idSchema },
    handler: async (ctx, input) => {
      try {
        await deleteDraft(input.id, auditFor(ctx, "delete_product_draft"));
        return ok({ deleted: true });
      } catch (err) {
        return toolError("delete_product_draft", err);
      }
    },
  }),
];
