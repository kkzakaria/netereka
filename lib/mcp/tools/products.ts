import {
  type DraftAudit,
  DraftError,
  MAX_IMAGES_PER_PRODUCT,
  addImagesFromUrls,
  countProductImages,
  createDraft,
  deleteDraft,
  findProductImage,
  getProduct,
  getProductDraftState,
  productColumnsForRevision,
  removeImage,
  searchProducts,
  setColorVariants,
  updateDraft,
} from "@/lib/db/product-drafts";
import { RevisionError, createRevision } from "@/lib/db/revisions";
import { fetchAndUploadImage, type FetchImageResult } from "@/lib/storage/fetch-image";
import { deleteFromR2 } from "@/lib/storage/images";
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
 *
 * Images are the one place this routing does more than pick a path.
 * `add_product_images` on a published product uploads to R2 *at deposit*
 * (`fetchAndUploadImage`, same helper as the draft path) and the revision
 * payload carries the resulting R2 key — never the source URL. Deferring the
 * download to application time would let Appliquer fail on a dead link or a
 * timeout long after the model handed back a "pending" answer, for a change
 * an administrator had already approved. The corollary: a *rejected*
 * `add_images` revision leaves an R2 object nothing will ever reference —
 * `rejectRevision` (lib/db/revisions.ts) deletes it as part of rejecting.
 * `remove_product_image` deposits no such object (it proposes deleting an
 * existing one, at application time), so it has nothing to clean up on
 * reject. `delete_product_draft` is the one write in this file that is NOT
 * routed by `writePath`: it stays bound to drafts on purpose (§ plan tâche
 * 7) — deleting a live product is not a content edit a revision should carry.
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
      "Télécharge 1 à 8 images depuis des URL http(s) (≤5 Mo chacune, 12 max par produit) vers le stockage de la " +
      "boutique et les attache au produit. Sur un brouillon : attachées directement, la première devient l'image " +
      "principale. Sur une fiche publiée : si le total (images déjà présentes + celles-ci) dépasserait 12, refusé " +
      "avant tout téléchargement (limit_exceeded) — retirez des images ou déposez-en moins. Sinon, les images sont " +
      "téléversées immédiatement (le résultat les porte comme sur un brouillon), puis une révision est déposée pour " +
      "les attacher — l'administrateur doit l'appliquer depuis /revisions avant qu'elles n'apparaissent en " +
      "boutique (revision.id et revision.status dans la réponse). Succès partiel possible sur un brouillon : " +
      "vérifier results[].ok (reason limit_exceeded si le quota a été atteint entre-temps).",
    inputSchema: { id: idSchema, ...addImagesSchema.shape },
    handler: async (ctx, input) => {
      try {
        const { is_draft } = await getProductDraftState(input.id);

        if (writePath(is_draft) === "direct") {
          return ok({ applied: "direct", ...(await addImagesFromUrls(input.id, input.images, auditFor(ctx, "add_product_images"))) });
        }

        // Refus AVANT tout téléchargement, comme le chemin brouillon
        // (`addImagesFromUrls`, lib/db/product-drafts.ts) : sans ce contrôle,
        // le dépôt téléverserait vers R2, créerait une révision vouée à ne
        // jamais s'appliquer entièrement (voir la garde symétrique dans
        // `applyRevision`, lib/db/revisions.ts), et l'admin ne le découvrirait
        // qu'à l'application. Mesuré en production : 182 fiches publiées sur
        // 996 portent déjà ≥5 images, et cet outil en accepte jusqu'à 8 par
        // appel — 5 + 8 = 13 > 12 est atteignable aujourd'hui.
        const existingCount = await countProductImages(input.id);
        if (existingCount + input.images.length > MAX_IMAGES_PER_PRODUCT) {
          return fail(
            "limit_exceeded",
            `Au plus ${MAX_IMAGES_PER_PRODUCT} images par produit (${existingCount} déjà présentes).`,
          );
        }

        // Fiche publiée : téléversement immédiat vers R2 — voir le
        // commentaire de haut de fichier. La révision ne porte jamais l'URL
        // source, seulement la clé déjà en place.
        type ImageInput = (typeof input.images)[number];
        type FetchSuccess = Extract<FetchImageResult, { ok: true }>;
        type Entry = { img: ImageInput } & (
          | { r: FetchSuccess; ok: true }
          | { r: Exclude<FetchImageResult, { ok: true }>; ok: false }
        );
        const fetched: Entry[] = await Promise.all(
          input.images.map(async (img): Promise<Entry> => {
            const r = await fetchAndUploadImage(input.id, img.url);
            return r.ok ? { img, r, ok: true } : { img, r, ok: false };
          }),
        );
        const succeeded = fetched.filter((f): f is Extract<Entry, { ok: true }> => f.ok);
        const results = fetched.map(({ img, r, ok: succeededOne }) =>
          succeededOne
            ? { url: img.url, ok: true as const }
            : { url: img.url, ok: false as const, reason: (r as Exclude<FetchImageResult, { ok: true }>).reason });

        if (succeeded.length === 0) {
          return ok({ applied: "revision", results, revision: null, message: "Aucune image n'a pu être téléchargée." });
        }

        try {
          const payload = { images: succeeded.map(({ img, r }) => ({ key: r.key, alt: img.alt ?? null })) };
          const { revisionId, status } = await createRevision({
            target: "product",
            targetId: input.id,
            kind: "add_images",
            payload,
            origin: "mcp",
            actor: { id: ctx.user.id, name: ctx.user.name },
          });
          return ok({
            applied: "revision",
            results,
            revision: { id: revisionId, status },
            message:
              `Fiche publiée : ${succeeded.length} image(s) déposée(s) en révision (${revisionId}), en attente de ` +
              `validation par un administrateur sur /revisions/${revisionId}.`,
          });
        } catch (err) {
          // La révision n'a pas pu être déposée : sans ce nettoyage, les
          // objets déjà envoyés dans R2 ci-dessus resteraient orphelins —
          // aucune ligne product_images ne les référencera jamais.
          await Promise.allSettled(succeeded.map(({ r }) => deleteFromR2(r.key)));
          throw err;
        }
      } catch (err) {
        return toolError("add_product_images", err);
      }
    },
  }),

  defineTool({
    name: "remove_product_image",
    description:
      "Retire une image d'un produit. Sur un brouillon : suppression directe (ligne et fichier), la suivante " +
      "devient principale si besoin. Sur une fiche publiée : dépose une révision que l'administrateur doit " +
      "appliquer depuis /revisions — le fichier n'est effacé qu'à l'application, pas au dépôt.",
    inputSchema: { id: idSchema, image_id: idSchema },
    handler: async (ctx, input) => {
      try {
        const { is_draft } = await getProductDraftState(input.id);

        if (writePath(is_draft) === "direct") {
          await removeImage(input.id, input.image_id, auditFor(ctx, "remove_product_image"));
          return ok({ applied: "direct", removed: true });
        }

        const img = await findProductImage(input.id, input.image_id);
        if (!img) return fail("not_found", "Image introuvable sur ce produit.");

        const { revisionId, status } = await createRevision({
          target: "product",
          targetId: input.id,
          kind: "remove_image",
          payload: { image_id: input.image_id },
          origin: "mcp",
          actor: { id: ctx.user.id, name: ctx.user.name },
        });
        return ok({
          applied: "revision",
          revision: { id: revisionId, status },
          message:
            `Fiche publiée : la suppression de l'image a été déposée en révision (${revisionId}), en attente de ` +
            `validation par un administrateur sur /revisions/${revisionId}.`,
        });
      } catch (err) {
        return toolError("remove_product_image", err);
      }
    },
  }),

  defineTool({
    name: "set_product_variants",
    description:
      "Définit les variantes couleur d'un produit (remplace l'ensemble). Sur un brouillon : écrit directement. Sur " +
      "une fiche publiée : dépose une révision que l'administrateur doit appliquer depuis /revisions. price absent " +
      "ou uniform_price=true → prix de base du produit. Les variantes retirées sont supprimées. Le stock du produit " +
      "devient la somme des stocks. Déclarer les mêmes couleurs dans attributes.colors.",
    inputSchema: { id: idSchema, ...setVariantsSchema.shape },
    handler: async (ctx, input) => {
      try {
        const { id, ...rest } = input;
        const { is_draft } = await getProductDraftState(id);

        if (writePath(is_draft) === "direct") {
          const result = await setColorVariants(id, rest, auditFor(ctx, "set_product_variants"));
          return ok({ applied: "direct", ...result });
        }

        const { revisionId, status } = await createRevision({
          target: "product",
          targetId: id,
          kind: "set_variants",
          payload: { variants: rest.variants, uniform_price: rest.uniform_price },
          origin: "mcp",
          actor: { id: ctx.user.id, name: ctx.user.name },
        });
        return ok({
          applied: "revision",
          revision: { id: revisionId, status },
          message:
            `Fiche publiée : les variantes proposées ont été déposées en révision (${revisionId}), en attente de ` +
            `validation par un administrateur sur /revisions/${revisionId}.`,
        });
      } catch (err) {
        return toolError("set_product_variants", err);
      }
    },
  }),

  defineTool({
    name: "publish_product",
    description:
      "Propose la publication d'un brouillon : dépose une révision de type publish (payload vide — seul is_draft " +
      "change, pas le contenu) que l'administrateur doit appliquer depuis /revisions pour que la fiche devienne " +
      "visible en boutique. Refuse avec conflict si la fiche est déjà publiée. Aucun outil de dépublication " +
      "n'existe : un retrait du catalogue reste une décision humaine directe, hors MCP.",
    inputSchema: { id: idSchema },
    handler: async (ctx, input) => {
      try {
        const { is_draft } = await getProductDraftState(input.id);
        if (!is_draft) {
          return fail("conflict", "Cette fiche est déjà publiée.");
        }
        const { revisionId, status } = await createRevision({
          target: "product",
          targetId: input.id,
          kind: "publish",
          payload: {},
          origin: "mcp",
          actor: { id: ctx.user.id, name: ctx.user.name },
        });
        return ok({
          applied: "revision",
          revision: { id: revisionId, status },
          message:
            `Publication déposée en révision (${revisionId}), en attente de validation par un administrateur sur ` +
            `/revisions/${revisionId}.`,
        });
      } catch (err) {
        return toolError("publish_product", err);
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
