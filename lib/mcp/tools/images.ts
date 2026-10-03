import {
  MONTHLY_LIMIT_ENV,
  checkImageBudget,
  recordImagesProduced,
  type BudgetDecision,
} from "@/lib/ai/image-budget";
import { editProductImage, encodeSourceImage, type ImageEditResult } from "@/lib/ai/image-generation";
import { getEnv, getKV } from "@/lib/cloudflare/context";
import {
  type DraftAudit,
  DraftError,
  MAX_IMAGES_PER_PRODUCT,
  addImagesFromUrls,
  countProductImages,
  findProductImage,
  getProductDraftState,
  r2KeyFromImageUrl,
} from "@/lib/db/product-drafts";
import { RevisionError, createRevision } from "@/lib/db/revisions";
import { searchImages, type ImageSearchResult } from "@/lib/media/image-search";
import { fetchAndUploadImage } from "@/lib/storage/fetch-image";
import { deleteFromR2, readFromR2 } from "@/lib/storage/images";
import type { McpContext } from "@/lib/mcp/context";
import { ok, fail, type McpErrorCode, type ToolResult } from "@/lib/mcp/result";
import { generateProductImageShape, searchProductImagesShape } from "@/lib/validations/mcp-image";
import { defineTool, type ToolDefinition } from "./types";

/**
 * Outils d'images du MCP.
 *
 * `search_product_images` ne télécharge RIEN : elle montre au modèle à quoi
 * ressemble réellement le produit avant qu'il compose. L'attachement passe par
 * `add_product_images` (URL choisie par le modèle) ou par
 * `generate_product_image` (§ 4.2 du spec).
 *
 * `generate_product_image` compose autour d'une photo DÉJÀ attachée au
 * produit, et le résultat redescend par `lib/storage/fetch-image.ts` — garde
 * SSRF, plafond 5 Mo, délai 10 s. Aucun second chemin de téléchargement n'est
 * ouvert ici, pas même pour le résultat de la génération.
 *
 * Même routage que les outils produits (`writePath`, lib/mcp/tools/products.ts) :
 * sur un brouillon l'image s'attache directement, sur une fiche publiée elle
 * part en révision `add_images` que l'administrateur applique.
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

type GenerationFailure = Extract<ImageEditResult, { ok: false }>["reason"];

/**
 * Traduction des échecs de `editProductImage`. Même principe que
 * `SEARCH_FAILURES` : `Record` exhaustif, donc une raison ajoutée en amont
 * sans message ici casse la compilation.
 *
 * `no_api_key` NOMME le secret manquant. Le secret `XAI_API_KEY` n'existe sur
 * aucun déploiement de ce projet au 2026-10-01 : c'est donc le message que
 * l'administrateur verra au premier appel, et il doit lui dire quoi faire.
 */
const GENERATION_FAILURES: Record<GenerationFailure, { code: McpErrorCode; message: string }> = {
  no_api_key: {
    code: "internal_error",
    message:
      "Génération d'images indisponible : le secret XAI_API_KEY n'est pas configuré sur ce déploiement. " +
      "Aucune image n'a été produite et rien n'a été facturé. Un administrateur doit poser ce secret " +
      "(npx wrangler secret put XAI_API_KEY) ; en attendant, utilise search_product_images puis " +
      "add_product_images pour attacher une image existante.",
  },
  auth_failed: {
    code: "internal_error",
    // Pas de « 401/403 » : xAI ne documente que 200/400/422 pour cet endpoint,
    // et le classement vient d'une HEURISTIQUE sur le corps du 400. Le message
    // dit donc l'hypothèse la plus probable sans l'affirmer, et le détail de
    // xAI est accolé par l'appelant — c'est lui qui tranche.
    message:
      "xAI a rejeté la demande sur un motif qui ressemble à un problème de clé : XAI_API_KEY est " +
      "probablement expirée, révoquée ou sans droit sur grok-imagine-image. Un administrateur doit la " +
      "vérifier. Si le détail ci-dessous parle de l'invite et non de la clé, c'est l'invite qu'il faut corriger",
  },
  rate_limited: {
    code: "limit_exceeded",
    // Pas d'affirmation sur la CAUSE : un 429 de xAI couvre aussi bien une
    // limite de débit qu'un crédit épuisé ou une facturation non activée. Dire
    // « réessaie dans quelques minutes » sur un compte sans crédit fait
    // attendre indéfiniment. Le détail de xAI, accolé par l'appelant, tranche.
    message:
      "xAI a répondu 429. Ce code couvre deux causes très différentes : une limite de débit, qui passe en " +
      "attendant, ou un crédit épuisé / une facturation non activée, qui ne passera jamais seule et demande " +
      "un administrateur. Le détail ci-dessous vient de xAI et dit laquelle",
  },
  rejected: {
    code: "validation_error",
    message: "xAI a refusé la demande",
  },
  upstream_error: {
    code: "internal_error",
    message: "xAI a répondu une erreur serveur. Aucune image produite. Réessaie plus tard.",
  },
  parse_failed: {
    code: "internal_error",
    message: "Réponse illisible de xAI (200 mais corps non-JSON). Réessaie plus tard.",
  },
  no_image: {
    code: "internal_error",
    message: "xAI a répondu sans URL d'image : rien à télécharger, rien n'a été attaché.",
  },
  b64_not_supported: {
    code: "internal_error",
    message:
      "xAI a renvoyé l'image en base64 alors qu'une URL était demandée. Refusé : le seul chemin de " +
      "téléchargement du dépôt est lib/storage/fetch-image.ts (garde SSRF, plafond 5 Mo), et décoder " +
      "du base64 ici le contournerait. À traiter côté code, pas côté invite.",
  },
  timeout: {
    code: "internal_error",
    message: "Délai dépassé en attendant xAI. L'image a peut-être été produite et facturée sans être attachée.",
  },
  fetch_failed: {
    code: "internal_error",
    message: "Impossible de joindre xAI (réseau). Aucune image produite.",
  },
};

/** Traduction des refus budgétaires. L'usage ET le plafond sont DANS le
 *  message : un plafond atteint sans dire lequel oblige à lire le code. */
function budgetRefusal(d: Exclude<BudgetDecision, { ok: true }>): ToolResult {
  switch (d.reason) {
    case "not_configured":
      return fail(
        "internal_error",
        `Génération refusée : le plafond mensuel d'images (${MONTHLY_LIMIT_ENV}) n'est pas configuré sur ce ` +
          "déploiement. Un plafond absent ne vaut pas « illimité » — chaque image est facturée, donc la " +
          "génération refuse jusqu'à ce qu'un administrateur fixe cette valeur : " +
          `\`npx wrangler secret put ${MONTHLY_LIMIT_ENV}\`, ou une entrée \`vars\` dans wrangler.jsonc. ` +
          "C'est un nombre entier d'images par mois ; 0 désactive explicitement la génération.",
      );
    case "limit_unreadable":
      return fail(
        "internal_error",
        `Génération refusée : le plafond mensuel ${MONTHLY_LIMIT_ENV} vaut « ${d.raw} », qui n'est pas un ` +
          "nombre entier d'images. Un administrateur doit corriger cette valeur " +
          `(\`npx wrangler secret put ${MONTHLY_LIMIT_ENV}\`, ou l'entrée \`vars\` de wrangler.jsonc).`,
      );
    case "usage_unavailable":
      return fail(
        "internal_error",
        `Génération refusée : le compteur mensuel d'images n'a pas pu être lu (${d.detail}). On ne sait donc ` +
          "pas où en est la dépense du mois, et repartir de zéro déplafonnerait le mois entier sur une panne " +
          "passagère. Réessaie ; si cela persiste, la base est indisponible.",
      );
    case "monthly_budget_exceeded":
      return fail(
        "limit_exceeded",
        `Plafond mensuel d'images atteint : ${d.used} image(s) produite(s) ce mois-ci pour un plafond de ` +
          `${d.limit}. Aucune image n'a été produite ni facturée. Le compteur repart au 1er du mois prochain ; ` +
          `un administrateur peut relever ${MONTHLY_LIMIT_ENV}.`,
      );
    case "rate_limited":
      return fail(
        "limit_exceeded",
        `Trop de générations rapprochées : au plus ${d.max} par ${Math.round(d.windowSeconds / 60)} minutes et ` +
          "par administrateur. Aucune image n'a été produite. Réessaie plus tard.",
      );
  }
}

/**
 * Un seul libellé pour « l'image existe, elle est payée, elle n'est pas
 * attachée ». Les deux chemins (brouillon, fiche publiée) rendent le MÊME
 * message : c'est le même événement, et l'écrire deux fois est ce qui a laissé
 * les deux branches diverger — le côté brouillon le rendait en succès.
 *
 * L'état du COMPTEUR n'est pas dans cette constante, et c'est le point : elle
 * a d'abord affirmé « le compteur a bien compté cette image », ce qu'une
 * constante ne peut pas savoir. Sur une double panne — écriture D1 impossible,
 * puis téléchargement raté — elle affirmait un comptage qui n'avait pas eu
 * lieu. La phrase vient donc de `billedCounterNote(recorded)`.
 *
 * Elle porte l'état du compteur dans le MESSAGE et non dans un champ : `fail`
 * ne transporte que des `fieldErrors`, et élargir ce helper partagé par vingt
 * outils pour ce seul appel coûterait plus que ça ne rapporte. Le message est
 * ce que lit le modèle comme l'administrateur.
 */
const BILLED_BUT_UNATTACHED =
  "L'image a été générée (et facturée) mais son téléchargement a échoué : elle n'est PAS attachée au produit. " +
  "Réessaie — l'URL temporaire de xAI a pu expirer.";

/** Ce que le compteur mensuel a réellement fait, et non ce qu'il devait faire. */
function billedCounterNote(recorded: boolean): string {
  return recorded
    ? "Le compteur mensuel a compté cette image, puisqu'elle a été produite."
    : "ATTENTION : le compteur mensuel n'a PAS pu être incrémenté pour cette image pourtant facturée — " +
      "le total du mois sous-compte d'autant.";
}

function auditFor(ctx: McpContext, tool: string): DraftAudit {
  return { actor: { id: ctx.user.id, name: ctx.user.name }, details: { via: "mcp", tool, client_id: ctx.clientId } };
}

function toolError(toolName: string, err: unknown): ToolResult {
  if (err instanceof DraftError) return fail(err.code, err.message);
  if (err instanceof RevisionError) return fail(err.code, err.message);
  console.error(`[mcp/${toolName}]`, err);
  return fail("internal_error", "Erreur interne, réessayez ou contactez un administrateur");
}

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

  defineTool({
    name: "generate_product_image",
    description:
      "Compose un nouveau visuel produit à partir d'une image DÉJÀ attachée au produit (grok-imagine-image-2.0 " +
      "en mode édition). source_image_id est l'id d'une image du produit — relis-le avec get_product — et non " +
      "une URL : le modèle compose le décor, l'éclairage, la mise en situation autour de la photo réelle, il ne " +
      "réinvente pas l'objet. Sur un brouillon, le résultat est attaché directement. Sur une fiche publiée, il " +
      "est déposé en révision add_images que l'administrateur doit appliquer depuis /revisions avant qu'il " +
      "n'apparaisse en boutique. Chaque image est FACTURÉE : la génération est bornée par un plafond mensuel et " +
      "par un quota de rafale, et un dépassement est un échec explicite qui dit l'usage et le plafond. Refusé " +
      "avant toute dépense si le produit atteindrait 12 images. prompt : ce qu'il faut composer (décor, " +
      "lumière, cadrage), 10 à 1000 caractères.",
    inputSchema: generateProductImageShape,
    handler: async (ctx, input): Promise<ToolResult> => {
      const productId = input.product_id;
      try {
        // ─── Tout ce qui peut refuser AVANT de dépenser ───
        // L'ordre est la règle du fichier : rien de facturé ne part tant
        // qu'un refus est encore possible. Une image produite puis jetée
        // parce que la fiche était pleine serait payée pour rien.
        const { is_draft } = await getProductDraftState(productId);

        const source = await findProductImage(productId, input.source_image_id);
        if (!source) {
          return fail(
            "not_found",
            "Image source introuvable sur ce produit. source_image_id doit être l'id d'une image DÉJÀ attachée " +
              "à cette fiche (voir images[].id dans get_product), pas une URL.",
          );
        }

        const existingCount = await countProductImages(productId);
        if (existingCount + 1 > MAX_IMAGES_PER_PRODUCT) {
          return fail(
            "limit_exceeded",
            `Au plus ${MAX_IMAGES_PER_PRODUCT} images par produit (${existingCount} déjà présentes) : retire une ` +
              "image avant de générer. Rien n'a été généré ni facturé.",
          );
        }

        const env = await getEnv();
        // La clé avant le budget : un déploiement sans clé ne doit pas
        // consommer un jeton de rafale pour apprendre qu'il n'a pas de clé.
        if (!env.XAI_API_KEY) {
          const { code, message } = GENERATION_FAILURES.no_api_key;
          return fail(code, message);
        }

        // Un seul binding KV pour le contrôle ET l'enregistrement : deux
        // appels à `getKV()` ouvriraient la possibilité de compter dans un
        // espace et de contrôler dans un autre.
        const kv = await getKV();
        // Un seul instant pour les deux bouts : sans ça, `checkImageBudget` et
        // `recordImagesProduced` appellent chacun `new Date()`, et un appel à
        // cheval sur minuit UTC du 1er contrôle le mois N puis incrémente le
        // mois N+1. Une image mal imputée, au plus une par mois — la couture
        // est gratuite à fermer, donc on la ferme.
        const now = new Date();
        const decision = await checkImageBudget({
          kv,
          limitRaw: env.AI_IMAGE_MONTHLY_LIMIT,
          actorId: ctx.user.id,
          now,
        });
        if (!decision.ok) return budgetRefusal(decision);

        // ─── Lecture de la source ───
        const r2Key = r2KeyFromImageUrl(source.url);
        const object = await readFromR2(r2Key);
        if (!object) {
          return fail(
            "not_found",
            "Le fichier de l'image source est absent du stockage (la fiche la référence mais l'objet n'y est " +
              "plus). Choisis une autre image source, ou réattache celle-ci. Rien n'a été généré ni facturé.",
          );
        }
        const encoded = encodeSourceImage(object.bytes, object.contentType, r2Key);
        if (!encoded.ok) {
          return fail(
            "validation_error",
            `Image source inexploitable comme base d'édition (${encoded.detail}). Choisis une autre image ` +
              "source. Rien n'a été généré ni facturé.",
          );
        }

        // ─── La dépense ───
        const edited = await editProductImage({ sourceImage: encoded.dataUri, prompt: input.prompt });
        if (!edited.ok) {
          const { code, message } = GENERATION_FAILURES[edited.reason];
          // Un échec de génération ne consomme RIEN du plafond mensuel :
          // `recordImagesProduced` n'est pas appelée sur ce chemin.
          return fail(code, edited.detail ? `${message} : ${edited.detail}` : message);
        }

        // xAI a produit une image : c'est l'instant facturé, donc l'instant
        // où le compteur du mois bouge — avant le téléchargement, qui peut
        // encore échouer sans rien rembourser.
        let budgetRecorded = true;
        try {
          await recordImagesProduced(1, now);
        } catch (err) {
          // Perdre le comptage déplafonnerait le mois. On ne jette pas pour
          // autant une image déjà payée : on le DIT dans la réponse, pour que
          // ce ne soit pas une perte silencieuse.
          budgetRecorded = false;
          console.error("[mcp/generate_product_image] compteur mensuel non incrémenté", err);
        }

        const budget = { recorded: budgetRecorded, used_before: decision.used, limit: decision.limit };

        // ─── Le retour dans R2, par le chemin unique ───
        if (is_draft) {
          // `addImagesFromUrls` télécharge par `fetchAndUploadImage`, insère
          // la ligne (image principale, ordre, plafond résolus en SQL) et
          // journalise — on ne réécrit pas ce chemin pour une image générée.
          const attached = await addImagesFromUrls(
            productId,
            [{ url: edited.url, alt: input.alt ?? null }],
            auditFor(ctx, "generate_product_image"),
          );
          // `addImagesFromUrls` NE LÈVE PAS sur un téléchargement raté : elle
          // rend `results: [{ ok: false, reason }]` (lib/db/product-drafts.ts).
          // Sans ce contrôle, le même événement — une image produite et
          // facturée qui n'est pas attachée — se lisait « succès » sur un
          // brouillon et `internal_error` sur une fiche publiée, et le mot
          // « facturée » n'apparaissait que du second côté. Une asymétrie que
          // rien ne gardait : la réponse disait `generated: true` avec un
          // `results[0].ok === false` noyé dedans.
          const failed = attached.results.find((r) => !r.ok);
          if (failed) {
            return fail(
              "internal_error",
              `${BILLED_BUT_UNATTACHED} ${billedCounterNote(budgetRecorded)} (${failed.reason ?? "raison inconnue"})`,
            );
          }
          return ok({ applied: "direct", generated: true, budget, ...attached });
        }

        const fetched = await fetchAndUploadImage(productId, edited.url);
        if (!fetched.ok) {
          return fail(
            "internal_error",
            `${BILLED_BUT_UNATTACHED} ${billedCounterNote(budgetRecorded)} (${fetched.reason})`,
          );
        }

        try {
          const { revisionId, status } = await createRevision({
            target: "product",
            targetId: productId,
            kind: "add_images",
            payload: { images: [{ key: fetched.key, alt: input.alt ?? null }] },
            origin: "mcp",
            actor: { id: ctx.user.id, name: ctx.user.name },
          });
          return ok({
            applied: "revision",
            generated: true,
            budget,
            revision: { id: revisionId, status },
            message:
              `Fiche publiée : l'image générée a été déposée en révision (${revisionId}), en attente de ` +
              `validation par un administrateur sur /revisions/${revisionId}.`,
          });
        } catch (err) {
          // Sans ce nettoyage, l'objet déjà monté dans R2 resterait orphelin :
          // aucune ligne product_images ne le référencera jamais. Même garde
          // que le chemin révision d'`add_product_images`.
          //
          // try/catch et non `.catch()` : un échec SYNCHRONE du nettoyage
          // (binding R2 absent — `deleteFromR2` lève avant de rendre une
          // promesse) remplacerait sinon `err` par une TypeError, et
          // l'administrateur lirait « erreur interne » au lieu du conflit de
          // révision qui est la vraie cause.
          try {
            await deleteFromR2(fetched.key);
          } catch (e) {
            console.warn("[mcp/generate_product_image] objet R2 orphelin", fetched.key, e);
          }
          throw err;
        }
      } catch (err) {
        return toolError("generate_product_image", err);
      }
    },
  }),
];
