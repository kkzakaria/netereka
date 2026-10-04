import { DraftError, type DraftAudit } from "@/lib/db/product-drafts";
import { deleteBannerRow, getBannerById, insertInactiveBanner, listBanners } from "@/lib/db/banners";
import { RevisionError, createRevision, listPendingRevisions, listPendingRevisionHandles } from "@/lib/db/revisions";
import type { McpContext } from "@/lib/mcp/context";
import { ok, fail, type McpErrorCode, type ToolResult } from "@/lib/mcp/result";
import {
  bannerIdSchema,
  checkBannerDates,
  createBannerShape,
  setBannerImageShape,
  updateBannerShape,
} from "@/lib/validations/mcp-banner";
import { fetchAndUploadImageTo, type FetchImageResult } from "@/lib/storage/fetch-image";
import { deleteFromR2 } from "@/lib/storage/images";
import { getImageUrl } from "@/lib/utils/images";
import { withdrawReasonSchema } from "@/lib/validations/mcp-common";
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

function auditFor(ctx: McpContext, tool: string): DraftAudit {
  return { actor: { id: ctx.user.id, name: ctx.user.name }, details: { via: "mcp", tool, client_id: ctx.clientId } };
}

type FetchFailure = Exclude<FetchImageResult, { ok: true }>["reason"];

/**
 * Chaque échec typé du téléchargement garde son identité jusqu'au client,
 * comme `SEARCH_FAILURES` (lib/mcp/tools/images.ts). Replier les six sur
 * « image inaccessible » enverrait le modèle chercher une autre URL quand la
 * cause est un AVIF (changer d'URL n'y changera rien) ou une panne de notre
 * stockage (rien de ce qu'il tentera n'aidera). Le `Record` est exhaustif par
 * construction : une raison ajoutée à `FetchImageResult` casse la compilation
 * au lieu de tomber dans un repli muet.
 */
const FETCH_FAILURES: Record<FetchFailure, { code: McpErrorCode; message: string }> = {
  ssrf: {
    code: "validation_error",
    message: "Cette URL vise une adresse interne ou un protocole non http(s). Donnez une URL publique.",
  },
  bad_status: {
    code: "validation_error",
    message: "L'hôte a refusé de servir cette image. Vérifiez l'URL, ou prenez-en une autre.",
  },
  bad_content_type: {
    code: "validation_error",
    message:
      "Nous n'acceptons que le JPEG, le PNG et le WebP. L'AVIF est refusé : le redimensionneur de la " +
      "vitrine ne sait pas le lire, et l'image serait invisible une fois en ligne.",
  },
  too_large: { code: "validation_error", message: "Image trop lourde : 5 Mo au maximum." },
  timeout: { code: "internal_error", message: "L'hôte n'a pas répondu en 10 secondes. Réessayez ou changez d'URL." },
  fetch_failed: { code: "internal_error", message: "Téléchargement impossible depuis cette URL." },
  upload_failed: {
    code: "internal_error",
    message: "L'image a été téléchargée mais le stockage de la boutique l'a refusée. Prévenez un administrateur.",
  },
};

/**
 * L'URL publique d'un objet, ou `null` quand on ne peut pas la former.
 *
 * `getImageUrl` retombe sur `/images/<clé>` quand `NEXT_PUBLIC_R2_URL` — une
 * variable de BUILD, absente en local et en préproduction — n'est pas posée.
 * Ce chemin relatif ne correspond à AUCUNE route : rendu dans un
 * `<img src>` de `content_html`, il n'afficherait rien. Promettre « une URL
 * absolue » et livrer cela enverrait le modèle composer autour d'une image
 * invisible, sans qu'aucun message ne le dise. Mieux vaut l'absence, qui se
 * voit.
 */
function urlPubliqueOuNull(key: string): string | null {
  const url = getImageUrl(key);
  return /^https?:\/\//i.test(url) ? url : null;
}

function revisionAnswer(revisionId: string, status: string, message: string) {
  return { applied: "revision" as const, revision: { id: revisionId, status }, message };
}

export const bannerTools: ToolDefinition[] = [
  defineTool({
    name: "list_banners",
    description:
      "Liste TOUTES les bannières du hero, dans l'ordre du carrousel, avec leur identifiant. Commence par " +
      "là quand tu ne connais pas le numéro d'une bannière : get_banner, update_banner et withdraw_banner " +
      "en exigent un, et aucun outil de lecture ne le donne. " +
      "carousel_position est le rang de la diapositive à partir de 1, pas l'identifiant : quand un " +
      "administrateur parle de « la première bannière », traduis-le en carousel_position puis lis l'id sur " +
      "la même ligne. Une bannière qui ne s'affiche pas a carousel_position à null et not_displayed_because " +
      "donne TOUTES les raisons (désactivée, pas encore commencée, terminée) — il peut y en avoir deux, et " +
      "lever la première ne suffit alors pas à la faire revenir. " +
      "Le contenu HTML n'est pas renvoyé, seulement has_content_html : relis-le avec get_banner si tu en as " +
      "besoin. pending_revisions liste les modifications DÉJÀ déposées sur cette bannière et pas encore " +
      "tranchées par un administrateur : si elle n'est pas vide, vérifie avec get_banner qu'elle ne couvre " +
      "pas déjà ce que tu allais proposer — plusieurs révisions peuvent coexister, c'est l'administrateur " +
      "qui choisit celle qu'il applique. " +
      "count compte toutes les bannières, displayed_count les seules affichées. Aucun argument.",
    inputSchema: {},
    handler: async () => {
      try {
        const [rows, pending] = await Promise.all([listBanners(), listPendingRevisionHandles("banner")]);
        // Les révisions en attente par bannière : c'est ce qui dit à l'appelant
        // qu'une modification est déjà déposée, avant d'en déposer une seconde.
        const enAttente = new Map<string, { id: string; kind: string }[]>();
        for (const r of pending) {
          const liste = enAttente.get(r.target_id) ?? [];
          liste.push({ id: r.id, kind: r.kind });
          enAttente.set(r.target_id, liste);
        }
        return ok({
          banners: rows.map((b) => ({ ...b, pending_revisions: enAttente.get(String(b.id)) ?? [] })),
          count: rows.length,
          displayed_count: rows.filter((b) => b.carousel_position !== null).length,
        });
      } catch (err) {
        return toolError("list_banners", err);
      }
    },
  }),

  defineTool({
    name: "set_banner_image",
    description:
      "Pose l'image d'une bannière, ou la retire. Prends une URL http(s) PUBLIQUE de l'image source : elle est " +
      "téléchargée (5 Mo au maximum, JPEG/PNG/WebP — pas d'AVIF) et déposée dans le stockage de la boutique, " +
      "puis une révision est déposée pour l'attacher à la bannière ; l'administrateur l'applique depuis " +
      "/revisions, et l'image n'apparaît qu'ensuite. url: null retire l'image (rien n'est téléchargé). " +
      "La réponse porte image_key, la clé de stockage, et image_src, l'URL absolue à employer telle quelle " +
      "dans un <img src=\"…\"> si tu composes la bannière en HTML libre avec content_html (update_banner). " +
      "image_src peut être null si le serveur ne connaît pas l'adresse publique de son stockage : n'invente " +
      "alors pas d'URL à partir de image_key, elle ne s'afficherait pas. " +
      "reason (optionnel) : pourquoi cette image, lu par l'administrateur sur l'écran de validation.",
    inputSchema: setBannerImageShape,
    handler: async (ctx, input) => {
      try {
        const banner = await getBannerById(input.id);
        if (!banner) return fail("not_found", "Bannière introuvable.");

        if (input.url === null) {
          const { revisionId, status } = await createRevision({
            target: "banner",
            targetId: String(input.id),
            kind: "update",
            payload: { image_url: null },
            origin: "mcp",
            actor: { id: ctx.user.id, name: ctx.user.name },
            summary: input.reason,
          });
          return ok({
            ...revisionAnswer(
              revisionId,
              status,
              `Retrait de l'image déposé en révision (${revisionId}), en attente de validation sur ` +
              `/revisions/${revisionId}.`,
            ),
            image_key: null,
            image_src: null,
          });
        }

        // Téléversement AU DÉPÔT, et la révision ne porte que la clé obtenue
        // — jamais l'URL source. Même raison que `add_product_images`
        // (lib/mcp/tools/products.ts) : différer le téléchargement à
        // l'application ferait échouer « Appliquer » sur un lien mort ou un
        // délai, longtemps après que le modèle a répondu « en attente » et que
        // l'administrateur a approuvé. Corollaire : une révision REJETÉE
        // laisse un objet que rien ne référencera jamais — `rejectRevision`
        // l'efface (lib/db/revisions.ts).
        const fetched = await fetchAndUploadImageTo(`banners/${input.id}`, input.url);
        if (!fetched.ok) {
          const { code, message } = FETCH_FAILURES[fetched.reason];
          return fail(code, fetched.reason === "bad_status" && fetched.status
            ? `${message} (HTTP ${fetched.status})`
            : message);
        }

        try {
          const { revisionId, status } = await createRevision({
            target: "banner",
            targetId: String(input.id),
            kind: "update",
            payload: { image_url: fetched.key },
            origin: "mcp",
            actor: { id: ctx.user.id, name: ctx.user.name },
            summary: input.reason,
          });
          return ok({
            ...revisionAnswer(
              revisionId,
              status,
              `Image déposée en révision (${revisionId}), en attente de validation par un administrateur sur ` +
              `/revisions/${revisionId}.`,
            ),
            image_key: fetched.key,
            image_src: urlPubliqueOuNull(fetched.key),
          });
        } catch (err) {
          // Le dépôt a échoué APRÈS le téléversement : sans ce nettoyage,
          // l'objet resterait dans R2 sans qu'aucune ligne ni aucune révision
          // ne le nomme. try/catch et non `.catch()` — un échec SYNCHRONE du
          // nettoyage (binding R2 absent) remplacerait sinon `err` par une
          // TypeError, et l'appelant lirait « erreur interne » au lieu de la
          // vraie cause.
          try {
            await deleteFromR2(fetched.key);
          } catch (e) {
            console.error("[mcp/set_banner_image] objet R2 orphelin", fetched.key, e);
          }
          throw err;
        }
      } catch (err) {
        return toolError("set_banner_image", err);
      }
    },
  }),

  defineTool({
    name: "get_banner",
    description:
      "Relit une bannière du hero : champs, contenu HTML (content_html, déjà assaini), état d'activation et " +
      "révisions en attente sur cette bannière. Toute modification d'une bannière est déposée en révision " +
      "et validée par un administrateur depuis /revisions.",
    inputSchema: { id: bannerIdSchema },
    handler: async (_ctx, input) => {
      try {
        const banner = await getBannerById(input.id);
        if (!banner) return fail("not_found", "Bannière introuvable.");
        const pending = await listPendingRevisions("banner", String(banner.id));
        return ok({
          banner,
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
      "validation le signale).",
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
      "price, bg_gradient_from/to, content_html (HTML libre assaini), starts_at/ends_at. Placée en dernière position.",
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
