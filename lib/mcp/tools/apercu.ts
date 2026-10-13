import { z } from "zod";
import { getEnv } from "@/lib/cloudflare/context";
import { getRevision } from "@/lib/db/revisions";
import { sujetApercu, type TypeApercu } from "@/lib/apercu/autorisation";
import { emettreJetonDeCapture, NOM_COOKIE_CAPTURE } from "@/lib/apercu/jeton-capture";
import {
  capturer,
  EchecDeCapture,
  ECRANS,
  type Capture,
  type CookieDeCapture,
  type LiaisonNavigateur,
  type NomDEcran,
} from "@/lib/apercu/capture";
import { fail, okWithImages } from "@/lib/mcp/result";
import { defineTool, type ToolDefinition } from "./types";

/**
 * REGARDER une révision avant de l'appliquer, sur mobile et sur bureau.
 *
 * POURQUOI CET OUTIL EXISTE. L'assistant compose du HTML LIBRE — bannières et
 * descriptions produit — et n'avait aucun moyen de voir le résultat. La revue
 * des quatre bannières l'a montré sans appel : la cartouche d'appel à l'action
 * recouverte à 89 % sur mobile, un contraste insuffisant, des points de
 * carrousel invisibles, une bannière coupée en bas sur les petits écrans. Rien
 * de tout cela ne se lit dans du HTML ; tout se voit sur une photo.
 *
 * L'écran `/apercu/<type>/<revision>` existait déjà (#402) et rend la révision
 * telle qu'elle SERAIT, avec les vrais composants, le vrai CSS et les vraies
 * images, sur la zone. Ce qui manquait n'était pas la page : c'était l'œil.
 *
 * DEUX ÉCRANS, ET PAS UN. Mobile (390 × 844) et bureau (1440 × 900). Les
 * défauts de la revue étaient presque tous propres à UN des deux : juger sur
 * un seul, c'est se rassurer sur la moitié des visiteurs.
 *
 * CE QUI N'EST PAS CAPTURÉ, parce que la page ne le rend pas : ni le prix, ni
 * le stock, ni les variantes, ni les images d'un produit. L'écran d'aperçu
 * NOMME ces changements en avertissement, et cet avertissement est DANS la
 * photo — c'est voulu, l'assistant doit le lire là où il regarde.
 */

const EN_LIGNE = "https://netereka.ci";

const apercuShape = {
  revision_id: z.string().min(1).describe("Identifiant de la révision à regarder."),
  ecrans: z
    .array(z.enum(["mobile", "bureau"]))
    .min(1)
    .optional()
    .describe(
      "Écrans à photographier. Par défaut les deux : un défaut d'affichage n'apparaît " +
        "souvent que sur l'un, et c'est leur comparaison qui le révèle.",
    ),
  pleine_page: z
    .boolean()
    .optional()
    .describe(
      "Photographier toute la hauteur du document plutôt que le seul écran visible. " +
        "Par défaut : faux pour une bannière (elle se joue au-dessus de la ligne de " +
        "flottaison), vrai pour un produit (la description est longue et c'est elle " +
        "qu'on vient juger).",
    ),
};

/** `target_type` en base ↔ segment d'URL de l'écran d'aperçu. */
const SEGMENT: Record<string, TypeApercu> = { banner: "banniere", product: "produit" };

export const apercuTools: ToolDefinition[] = [
  defineTool({
    name: "apercu_revision",
    description:
      "Photographie une révision en attente telle qu'elle s'afficherait sur le site, sur mobile " +
      "(390 × 844) et sur bureau (1440 × 900), et rend les images. À utiliser APRÈS avoir déposé " +
      "une révision de bannière ou de description produit, et AVANT de demander qu'on l'applique : " +
      "c'est le seul moyen de voir ce que le HTML composé donne réellement — recadrage, contraste, " +
      "texte recouvert, bannière coupée en bas. Les avertissements de l'écran d'aperçu (statut non " +
      "en attente, version de base dépassée, champs non rendus comme le prix ou le stock) " +
      "apparaissent sur la photo : lisez-les. Ne montre ni prix, ni stock, ni variantes, ni images " +
      "de produit — la page ne les rend pas.",
    inputSchema: apercuShape,
    handler: async (_ctx, input) => {
      const revision = await getRevision(input.revision_id);
      if (!revision) {
        return fail("not_found", `Aucune révision « ${input.revision_id} ».`);
      }

      const type = SEGMENT[revision.target_type];
      if (!type) {
        return fail(
          "validation_error",
          `Les révisions de type « ${revision.target_type} » n'ont pas d'écran d'aperçu. ` +
            "Seules les bannières et les produits en ont un.",
        );
      }

      const { BROWSER, BETTER_AUTH_SECRET, SITE_URL } = await getEnv();

      // La base publique, pas une URL interne : c'est Browser Run qui va
      // chercher la page, depuis l'infrastructure de Cloudflare — un client
      // extérieur, et non ce Worker s'appelant lui-même. La leçon du JWKS
      // (« un Worker ne doit pas récupérer sa propre URL publique ») ne
      // s'applique donc pas ici ; seul un déploiement réel le confirme.
      const base = SITE_URL || EN_LIGNE;
      const chemin = `/apercu/${type}/${revision.id}`;
      const url = `${base.replace(/\/+$/, "")}${chemin}`;

      // Le laissez-passer ne vaut QUE pour cette révision et QUE pour une
      // minute. Il voyage en COOKIE, jamais dans l'URL ni en en-tête : un
      // en-tête supplémentaire part avec TOUTES les requêtes de la page —
      // images sur r2.netereka.ci, et Google Tag Manager dès qu'un identifiant
      // GA sera configuré. Le `path` du cookie le réserve au seul document de
      // l'aperçu.
      const jeton = await emettreJetonDeCapture(
        BETTER_AUTH_SECRET,
        sujetApercu(type, revision.id),
      );
      const biscuits: CookieDeCapture[] = [
        {
          name: NOM_COOKIE_CAPTURE,
          value: jeton,
          domain: new URL(url).hostname,
          path: chemin,
        },
      ];

      const ecrans: NomDEcran[] = input.ecrans ?? (Object.keys(ECRANS) as NomDEcran[]);
      const pleinePage = input.pleine_page ?? type === "produit";

      const captures: Capture[] = [];
      for (const ecran of ecrans) {
        try {
          // En série, pas en parallèle : le laissez-passer dure une minute et
          // deux captures tiennent largement dedans, tandis que deux
          // navigateurs simultanés mordent sur un quota de dix.
          captures.push(await capturer(BROWSER as unknown as LiaisonNavigateur, url, ecran, biscuits, pleinePage));
        } catch (e) {
          if (e instanceof EchecDeCapture) {
            return fail("internal_error", `Capture ${ecran} impossible : ${e.message}`);
          }
          // Jamais la trace au client. Le motif part dans les journaux du
          // Worker, qui sont lisibles (observability est activée).
          console.error(`[apercu_revision] ${ecran} :`, e);
          return fail(
            "internal_error",
            `Capture ${ecran} impossible. Le motif est dans les journaux du Worker.`,
          );
        }
      }

      return okWithImages(
        captures.map((c) => ({ base64: enBase64(c.octets), mimeType: "image/jpeg" })),
        {
          revision_id: revision.id,
          type,
          cible: revision.target_id,
          nature: revision.kind,
          statut: revision.status,
          url_de_l_apercu: url,
          ecrans: captures.map((c) => ({
            nom: c.ecran,
            largeur: c.largeur,
            hauteur: c.hauteur,
            octets: c.octets.byteLength,
          })),
          pleine_page: pleinePage,
          rappel:
            "Ni le prix, ni le stock, ni les variantes, ni les images produit ne sont montrés : " +
            "les avertissements en haut de la photo nomment ce que la révision change sans l'afficher.",
        },
      );
    },
  }),
];

/** base64 par tranches : `String.fromCharCode(...bytes)` sur plusieurs
 *  centaines de kilo-octets dépasse la limite d'arguments du moteur et lève un
 *  RangeError. Même découpage que dans `lib/mcp/tools/images.ts`. */
function enBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let out = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(out);
}
