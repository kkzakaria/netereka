import {
  type DraftAudit,
  DraftError,
  addImagesFromUrls,
  createDraft,
  deleteDraft,
  getProduct,
  getProductDraftState,
  productColumnsForRevision,
  removeImage,
  searchProducts,
  setColorVariants,
  updateDraft,
} from "@/lib/db/product-drafts";
import { RevisionError, createRevision } from "@/lib/db/revisions";
import type { McpContext } from "@/lib/mcp/context";
import { ok, fail, type ToolResult } from "@/lib/mcp/result";
import {
  addImagesSchema,
  createDraftSchema,
  idSchema,
  searchProductsSchema,
  setVariantsSchema,
  updateDraftSchema,
  type UpdateDraftInput,
} from "@/lib/validations/mcp-product";
import { defineTool, type ToolDefinition } from "./types";

/**
 * Product tools. Reads (get_product) cover the whole catalogue, drafts and
 * published alike. Writes go through lib/db/product-drafts.ts, which still
 * refuses anything that is not `is_draft = 1` — so a published product is
 * never written directly from here. `writePath` decides, per write, whether
 * the target is a draft (write lands now) or published (the write is
 * deposited as a revision in lib/db/revisions.ts, for an administrator to
 * apply from /revisions). Publishing itself stays a revision too — no tool
 * here can flip is_draft on its own.
 */

/** Où va une écriture, selon l'état de la cible. Un brouillon s'écrit
 *  directement (comportement du lot A) ; une fiche publiée passe par une
 *  révision que l'administrateur applique. */
export function writePath(isDraft: boolean): "direct" | "revision" {
  return isDraft ? "direct" : "revision";
}

function toolError(toolName: string, err: unknown): ToolResult {
  if (err instanceof DraftError) return fail(err.code, err.message);
  if (err instanceof RevisionError) return fail(err.code, err.message);
  console.error(`[mcp/${toolName}]`, err);
  return fail("internal_error", "Erreur interne, réessayez ou contactez un administrateur");
}

/** Attribution recorded with the write: the admin behind the token and the OAuth client. */
function auditFor(ctx: McpContext, tool: string): DraftAudit {
  return { actor: { id: ctx.user.id, name: ctx.user.name }, details: { via: "mcp", tool, client_id: ctx.clientId } };
}

const DESCRIPTION_RULES =
  "Champs : name (requis), category_id (requis, voir list_categories), brand, short_description (≤120), " +
  "description_html (HTML libre, assaini côté serveur — c'est le contenu de l'onglet Description de la fiche), " +
  "faq_html (HTML libre de l'onglet FAQ : une suite de <details><summary>Question</summary><p>Réponse</p></details> " +
  "dans un <div class=\"nk-faq\">), " +
  "seo {meta_title ≤60, meta_description ≤160}, " +
  "attributes {colors[{name,hex}], dimensions {length_mm,height_mm,width_mm,weight_g}, specs[{name,value}]}, " +
  "pricing {base_price, compare_price, sku, stock_quantity, low_stock_threshold, weight_grams} (prix en XOF entiers). " +
  "Mise en page : emploie les classes de la charte — nk-section, nk-container, nk-grid, nk-card, nk-media, nk-specs, " +
  "nk-lead, nk-quote, nk-cta, nk-faq — plutôt que des styles en dur ; elles suivent le thème clair et sombre.";

/**
 * Partagé par `update_product` et son alias déprécié `update_product_draft` :
 * même routage, même réponse. Sur un brouillon, écrit directement via
 * `updateDraft` (comportement du lot A). Sur une fiche publiée, dépose une
 * révision (`createRevision`) au lieu d'écrire — voir `writePath` ci-dessus.
 *
 * `attributes` (table `product_attributes`) et `slug` ne sont pas des
 * colonnes de `products` : `productColumnsForRevision` les ignore
 * silencieusement, donc on les refuse ici, avant le dépôt, plutôt que de
 * laisser leur absence du payload se lire comme une réussite.
 */
async function updateProductHandler(toolName: string, ctx: McpContext, input: { id: string } & UpdateDraftInput): Promise<ToolResult> {
  const { id, ...patch } = input;
  try {
    const { is_draft } = await getProductDraftState(id);

    if (writePath(is_draft) === "direct") {
      const result = await updateDraft(id, patch, auditFor(ctx, toolName));
      return ok({ applied: "direct", ...result });
    }

    if (patch.attributes !== undefined) {
      return fail(
        "validation_error",
        "Les attributs (couleurs, dimensions, caractéristiques) d'une fiche publiée ne peuvent pas être " +
        "proposés en révision ; modifiez-les sur un brouillon.",
      );
    }
    if (patch.slug !== undefined) {
      return fail("validation_error", "Le slug d'une fiche publiée ne peut pas être proposé en révision.");
    }

    const payload = productColumnsForRevision(patch);
    if (Object.keys(payload).length === 0) {
      return fail("validation_error", "Aucun champ à modifier.");
    }

    const { revisionId, status } = await createRevision({
      target: "product",
      targetId: id,
      kind: "update",
      payload,
      origin: "mcp",
      actor: { id: ctx.user.id, name: ctx.user.name },
    });
    return ok({
      applied: "revision",
      revision: { id: revisionId, status },
      message:
        `Fiche publiée : la modification a été déposée en révision (${revisionId}), en attente de validation ` +
        `par un administrateur sur /revisions/${revisionId}.`,
    });
  } catch (err) {
    return toolError(toolName, err);
  }
}

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
    name: "get_product",
    description:
      "Relit une fiche produit complète, brouillon ou publiée : champs, attributs, images (URL publiques), variantes. " +
      "La réponse porte is_draft : true → une prochaine écriture s'applique directement ; false → elle sera déposée " +
      "en révision et devra être validée par un administrateur depuis /revisions.",
    inputSchema: { id: idSchema },
    handler: async (_ctx, input) => {
      try {
        return ok(await getProduct(input.id));
      } catch (err) {
        return toolError("get_product", err);
      }
    },
  }),

  defineTool({
    name: "get_product_draft",
    description:
      "Déprécié, conservé le temps d'un lot pour les clients déjà enregistrés : utiliser get_product. " +
      "Comportement identique (brouillon ou publié, is_draft dans la réponse).",
    inputSchema: { id: idSchema },
    handler: async (_ctx, input) => {
      try {
        return ok(await getProduct(input.id));
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
    name: "update_product",
    description:
      "Met à jour une fiche produit. Sur un brouillon : écrit directement. Sur une fiche publiée : dépose une " +
      "révision que l'administrateur doit appliquer depuis /revisions — la réponse le dit (applied: \"direct\" ou " +
      "\"revision\", avec revision.id et revision.status dans ce second cas). attributes et slug ne sont pas pris " +
      "en charge sur une fiche publiée (validation_error) : passez par un brouillon pour les modifier. " +
      `Champs absents ignorés, null efface. attributes fourni remplace tous les attributs : colors, dimensions et ` +
      `specs sont alors tous requis (relire la fiche avant pour ne rien perdre). slug optionnel (unique). ${DESCRIPTION_RULES}`,
    inputSchema: { id: idSchema, ...updateDraftSchema.shape },
    handler: (ctx, input) => updateProductHandler("update_product", ctx, input),
  }),

  defineTool({
    name: "update_product_draft",
    description:
      "Déprécié, conservé le temps d'un lot pour les clients déjà enregistrés : utiliser update_product. " +
      "Comportement identique (routage brouillon/publié).",
    inputSchema: { id: idSchema, ...updateDraftSchema.shape },
    handler: (ctx, input) => updateProductHandler("update_product_draft", ctx, input),
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
