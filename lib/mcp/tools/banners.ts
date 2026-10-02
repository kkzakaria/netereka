import { DraftError, type DraftAudit } from "@/lib/db/product-drafts";
import { deleteBannerRow, getBannerById, insertInactiveBanner } from "@/lib/db/banners";
import { RevisionError, createRevision, listPendingRevisions } from "@/lib/db/revisions";
import type { McpContext } from "@/lib/mcp/context";
import { ok, fail, type ToolResult } from "@/lib/mcp/result";
import {
  bannerIdSchema,
  checkBannerDates,
  createBannerShape,
  updateBannerShape,
} from "@/lib/validations/mcp-banner";
import { withdrawReasonSchema } from "@/lib/validations/mcp-common";
import { getPublicImageUrl } from "@/lib/utils/images";
import { defineTool, type ToolDefinition } from "./types";

/**
 * Outils bannières. Toute écriture sur une bannière EXISTANTE est une
 * révision, sans routage : une bannière n'a pas d'état brouillon, elle est
 * en ligne dès qu'elle est active, et l'administrateur applique depuis
 * /revisions. Aucun outil ici n'écrit la ligne d'une bannière existante.
 *
 * `create_banner` est le cas à part : la portée d'assainissement d'une
 * bannière est `banner-<id>` (`scopeFor`), et l'id n'existe qu'après
 * l'INSERT. Stratégie retenue : créer la ligne INACTIVE et VIDE (aucun HTML,
 * donc rien à assainir ni à afficher), puis déposer une révision de nature
 * `create` (§ 2.7 : l'écran montre la bannière entière, pas un diff) qui
 * porte le `content_html` ; c'est l'application qui l'active. Le payload stocké est ainsi toujours
 * assaini avec sa portée définitive. Un `target_id` nul à la création aurait
 * obligé `sanitizePayload` à assainir sans portée, ou à différer
 * l'assainissement à l'application — exactement ce que `sanitizePayload`
 * interdit (une révision ne contient jamais de HTML non assaini).
 *
 * Les trois natures enfant (`add_images`, `remove_image`, `set_variants`)
 * restent refusées sur une cible bannière par `assertValidPayload`
 * (lib/db/revisions.ts) ; ces outils n'en déposent aucune.
 */

function toolError(toolName: string, err: unknown): ToolResult {
  if (err instanceof DraftError) return fail(err.code, err.message);
  if (err instanceof RevisionError) return fail(err.code, err.message);
  console.error(`[mcp/${toolName}]`, err);
  return fail("internal_error", "Erreur interne, réessayez ou contactez un administrateur");
}

/**
 * Ce que la surface du hero impose, et RIEN DE PLUS.
 *
 * Décrit depuis le rendu réel (components/storefront/hero-banner.tsx), pas
 * depuis l'intention. Une version antérieure de ce texte décrivait une cage —
 * « grille de DEUX colonnes », « n'y compose pas une mise en page pleine
 * largeur » — qui était exacte au moment où elle a été écrite et qui ne l'est
 * plus : `content_html` occupe désormais la diapositive entière. La règle
 * retenue pour la suite : ne jamais décrire ici qu'un fait de la SURFACE
 * (dimensions, fond, vocabulaire disponible, ce qui n'est pas inscriptible).
 * Décrire une mise en page, c'est créer une dette qui se paie en descriptions
 * qui mentent.
 */
const BANNER_SURFACE =
  "LA SURFACE DU HERO (ce n'est pas un gabarit) : content_html est une COMPOSITION LIBRE qui occupe la " +
  "diapositive ENTIÈRE. Aucune grille, aucune colonne, aucun emplacement ne t'est imposé — compose à ta " +
  "guise. Rien d'autre que ton HTML n'est affiché sur la diapositive. Ce qui reste vrai de la surface : " +
  "(1) DIMENSIONS — toute la largeur du carrousel, et une hauteur FIXE qui dépend de la largeur d'écran : " +
  "280 px de haut en dessous de 640 px de large, 400 px de haut de 640 à 1023 px, 480 px de haut à partir " +
  "de 1024 px. Ce qui dépasse est COUPÉ : compose pour la plus petite des trois. " +
  "Ta composition commence en haut à gauche ; pour la centrer, pose ta propre enveloppe " +
  "(height:100%;display:flex;align-items:center) — la surface ne centre rien pour toi. " +
  "(2) FOND — un dégradé à 135° entre deux couleurs réglables (bg_gradient_from, bg_gradient_to ; navy " +
  "sombre par défaut), plus deux halos décoratifs. Le texte doit donc être CLAIR, et ne compte pas sur un " +
  "fond blanc. " +
  "(3) VOCABULAIRE — ces classes sont déjà stylées pour cette surface, tu n'as aucune couleur à écrire : " +
  "nk-banner (carte translucide), nk-banner-badge, nk-banner-title, nk-banner-subtitle, nk-banner-price, " +
  "nk-cta (bouton), nk-media (image fluide), nk-split (deux blocs côte à côte, si TU en veux), nk-grid. " +
  "Tu peux aussi écrire ton propre <style> : ses sélecteurs sont automatiquement restreints à cette " +
  "bannière, donc sans effet sur le reste de la page. " +
  "(4) IMAGE — image_url n'est PAS modifiable par ces outils : c'est une clé de stockage R2, pas une URL " +
  "libre, et un champ texte y laisserait poser n'importe quelle adresse ; pour changer l'image d'une " +
  "bannière, un administrateur passe par /banners. Mais get_banner renvoie image_public_url, son URL " +
  "publique déjà résolue : place-la où tu veux dans ta composition " +
  "(<img class=\"nk-media\" src=\"…\" alt=\"…\">). Personne ne l'affichera à côté de ton HTML, donc si tu " +
  "veux l'image, c'est à toi de la poser.";

function auditFor(ctx: McpContext, tool: string): DraftAudit {
  return { actor: { id: ctx.user.id, name: ctx.user.name }, details: { via: "mcp", tool, client_id: ctx.clientId } };
}

function revisionAnswer(revisionId: string, status: string, message: string) {
  return { applied: "revision" as const, revision: { id: revisionId, status }, message };
}

export const bannerTools: ToolDefinition[] = [
  defineTool({
    name: "get_banner",
    description:
      "Relit une bannière du hero : champs, contenu HTML (content_html, déjà assaini), état d'activation et " +
      "révisions en attente sur cette bannière. Toute modification d'une bannière est déposée en révision " +
      "et validée par un administrateur depuis /revisions. " +
      "banner.image_public_url : l'URL publique de son image, directement utilisable dans un attribut src — " +
      "c'est CELLE-LÀ qu'il faut placer, jamais image_url, qui n'est qu'une clé de stockage. Elle vaut null " +
      "si la bannière n'a pas d'image, ou si le site a été construit sans l'adresse publique du stockage : " +
      "l'image existe alors mais n'est pas adressable — ne devine aucune URL, compose sans elle. " +
      BANNER_SURFACE,
    inputSchema: { id: bannerIdSchema },
    handler: async (_ctx, input) => {
      try {
        const banner = await getBannerById(input.id);
        if (!banner) return fail("not_found", "Bannière introuvable.");
        const pending = await listPendingRevisions("banner", String(banner.id));
        return ok({
          // `image_url` reste tel quel (c'est la donnée stockée) et l'URL
          // publique s'ajoute À CÔTÉ : sans elle, « carte blanche » est
          // théorique, l'appelant ne pouvant pas adresser une clé R2 dans un
          // src. `getPublicImageUrl` rend null plutôt qu'un `/images/<clé>`
          // cassé quand NEXT_PUBLIC_R2_URL manque au build.
          banner: { ...banner, image_public_url: getPublicImageUrl(banner.image_url) },
          pending_revisions: pending.map((r) => ({ id: r.id, kind: r.kind, created_at: r.created_at })),
        });
      } catch (err) {
        return toolError("get_banner", err);
      }
    },
  }),

  defineTool({
    name: "update_banner",
    description:
      "Propose une modification d'une bannière existante. La ligne n'est jamais écrite directement : une " +
      "révision est déposée et l'administrateur doit l'appliquer depuis /revisions (la réponse porte " +
      "revision.id et revision.status). Champs : title, subtitle, badge_text, badge_color (mint|red|orange|blue), " +
      "link_url (chemin relatif commençant par /), cta_text, price (XOF entier), bg_gradient_from/to (#rrggbb), " +
      "content_html (HTML libre assaini côté serveur, rendu dans le hero), display_order, " +
      "starts_at/ends_at. Champs absents ignorés, null efface (pour ceux qui l'admettent). reason (optionnel) : pourquoi " +
      "cette modification, lu par l'administrateur sous le titre de l'écran de validation. Ne permet pas de " +
      "retirer une bannière : utilisez withdraw_banner (une ends_at passée la retire aussi, et l'écran de " +
      "validation le signale). " +
      BANNER_SURFACE,
    inputSchema: updateBannerShape,
    handler: async (ctx, input) => {
      try {
        const { id, reason, ...patch } = input;

        // Le patch est PARTIEL : `ends_at` seul se compare à la `starts_at`
        // déjà stockée. Valider le patch tel quel ne peut jamais refuser
        // quand une seule des deux dates y figure — c'est précisément le cas
        // qui retirerait une bannière en ligne du hero une fois appliqué.
        const stored = await getBannerById(id);
        if (!stored) return fail("not_found", "Bannière introuvable.");
        // Seulement si le patch touche une date : un changement de titre ne doit
        // pas être refusé pour une incohérence préexistante qu'il n'aggrave pas.
        const touchesDates = patch.starts_at !== undefined || patch.ends_at !== undefined;
        const dateError = touchesDates
          ? checkBannerDates({
              starts_at: patch.starts_at !== undefined ? patch.starts_at : stored.starts_at,
              ends_at: patch.ends_at !== undefined ? patch.ends_at : stored.ends_at,
            })
          : null;
        if (dateError) return fail("validation_error", dateError);

        const payload: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined) continue;
          payload[key] = value;
        }
        if (Object.keys(payload).length === 0) return fail("validation_error", "Aucun champ à modifier.");

        const { revisionId, status } = await createRevision({
          target: "banner",
          targetId: String(id),
          kind: "update",
          payload,
          origin: "mcp",
          actor: { id: ctx.user.id, name: ctx.user.name },
          summary: reason,
        });
        return ok(revisionAnswer(
          revisionId,
          status,
          `Bannière en ligne : la modification a été déposée en révision (${revisionId}), en attente de ` +
          `validation par un administrateur sur /revisions/${revisionId}.`,
        ));
      } catch (err) {
        return toolError("update_banner", err);
      }
    },
  }),

  defineTool({
    name: "withdraw_banner",
    description:
      "Propose le RETRAIT d'une bannière du carrousel (elle devient inactive). Rien n'est écrit directement : " +
      "une révision de type withdraw est déposée, et l'administrateur voit ce qui disparaît (sa place dans le " +
      "carrousel, ce qu'il en reste) puis doit saisir le titre de la bannière pour confirmer, depuis " +
      "/revisions. Le retrait est réversible (réactivation en un clic) : rien n'est supprimé. Refuse avec " +
      "conflict si la bannière est déjà inactive. reason : pourquoi la retirer, lu par l'administrateur.",
    inputSchema: { id: bannerIdSchema, reason: withdrawReasonSchema },
    handler: async (ctx, input) => {
      try {
        const { revisionId, status } = await createRevision({
          target: "banner",
          targetId: String(input.id),
          kind: "withdraw",
          payload: {},
          origin: "mcp",
          actor: { id: ctx.user.id, name: ctx.user.name },
          summary: input.reason,
        });
        return ok(revisionAnswer(
          revisionId,
          status,
          `Retrait déposé en révision (${revisionId}) : la bannière reste affichée tant qu'un administrateur ` +
          `n'a pas confirmé sur /revisions/${revisionId}.`,
        ));
      } catch (err) {
        return toolError("withdraw_banner", err);
      }
    },
  }),

  defineTool({
    name: "create_banner",
    description:
      "Crée une bannière. Elle est créée INACTIVE et vide (invisible en boutique), puis une révision est " +
      "déposée pour l'activer avec son content_html : l'administrateur doit l'appliquer depuis /revisions " +
      "avant qu'elle apparaisse (la réponse porte banner_id, revision.id et revision.status). Requis : title, " +
      "link_url (chemin relatif commençant par /). Optionnels : subtitle, badge_text, badge_color, cta_text, " +
      "price, bg_gradient_from/to, content_html (HTML libre assaini), starts_at/ends_at. Placée en dernière " +
      "position. " +
      BANNER_SURFACE,
    inputSchema: createBannerShape,
    handler: async (ctx, input) => {
      try {
        const dateError = checkBannerDates(input);
        if (dateError) return fail("validation_error", dateError);

        const { content_html, ...fields } = input;
        const bannerId = await insertInactiveBanner(fields, auditFor(ctx, "create_banner"));

        // Le HTML est assaini par `createRevision` (`sanitizePayload`), avec la
        // portée `scopeFor("banner", id)` : cet outil ne construit jamais `banner-<id>`.
        // `is_active` n'y figure pas : c'est `applyRevision` qui active la ligne,
        // pour la nature `create`. Les champs rédigés sont déjà sur la ligne
        // (inactive) ; l'écran les relit depuis elle.
        const payload: Record<string, unknown> = {};
        if (content_html) payload.content_html = content_html;

        try {
          const { revisionId, status } = await createRevision({
            target: "banner",
            targetId: String(bannerId),
            kind: "create",
            payload,
            origin: "mcp",
            actor: { id: ctx.user.id, name: ctx.user.name },
          });
          return ok({
            banner_id: bannerId,
            ...revisionAnswer(
              revisionId,
              status,
              `Bannière ${bannerId} créée inactive ; sa création est déposée en révision (${revisionId}), ` +
              `en attente de validation par un administrateur sur /revisions/${revisionId}.`,
            ),
          });
        } catch (err) {
          // Sans révision, la ligne ne sera jamais activée : on la retire
          // plutôt que de laisser une bannière fantôme (inactive, vide).
          await deleteBannerRow(bannerId).catch((cleanupErr) =>
            console.error(`[mcp/create_banner] bannière orpheline id=${bannerId}:`, cleanupErr));
          throw err;
        }
      } catch (err) {
        return toolError("create_banner", err);
      }
    },
  }),
];
