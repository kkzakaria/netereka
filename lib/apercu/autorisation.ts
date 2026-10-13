import { cookies } from "next/headers";
import { getEnv } from "@/lib/cloudflare/context";
import { requireAdmin } from "@/lib/auth/guards";
import { NOM_COOKIE_CAPTURE, verifierJetonDeCapture } from "./jeton-capture";

/**
 * Qui a le droit de voir un aperçu de révision : un administrateur connecté,
 * ou un capteur d'écran muni d'un laissez-passer pour CETTE révision.
 *
 * OÙ LA VÉRIFICATION A LIEU, ET POURQUOI ICI.
 *
 * Le middleware pourrait vérifier le jeton puis transmettre un en-tête du
 * genre `x-apercu-autorise: 1` que la page croirait. C'est le motif classique,
 * et il a un mode de panne que je ne veux pas : la page devient sûre
 * UNIQUEMENT parce que le middleware tourne. Or le middleware de ce dépôt
 * s'exécutait sur `/apercu` par accident — ce chemin n'était pas dans son
 * `config.matcher`, c'est l'entrée fourre-tout destinée à l'hôte `www` qui le
 * déclenchait. Bâtir une autorisation sur une exécution qu'on a constatée
 * fortuite, c'est accepter qu'elle tombe sans bruit le jour où elle cesse.
 *
 * Donc la page vérifie, elle-même, à chaque rendu. Le middleware ne fait que
 * LAISSER PASSER une requête porteuse de l'en-tête au lieu de la rediriger :
 * s'il se trompe, on arrive ici et c'est refusé. Aucune des deux pièces n'a
 * besoin de faire confiance à l'autre.
 *
 * LE SUJET SIGNÉ N'EST PAS L'URL. On signe `apercu/<type>/<revision>`, construit
 * par `sujetApercu` des deux côtés depuis les deux mêmes valeurs. Signer le
 * chemin d'URL obligerait la page à le RECONSTRUIRE, et le moindre écart —
 * barre finale, caractère encodé — ferait échouer la vérification d'un jeton
 * parfaitement légitime : la capture ramènerait la photo de la page de
 * connexion, pour une raison invisible.
 */

export type TypeApercu = "banniere" | "produit";

/** Le sujet signé. Construit ici, et nulle part ailleurs. */
export function sujetApercu(type: TypeApercu, revisionId: string): string {
  return `apercu/${type}/${revisionId}`;
}

/**
 * Autorise, ou redirige comme `requireAdmin()` l'a toujours fait.
 *
 * L'ordre compte : le jeton d'abord, parce qu'il ne coûte qu'un HMAC là où la
 * session coûte une lecture de D1 — et parce qu'un capteur n'a, par
 * construction, aucune session à présenter.
 */
export async function autoriserApercu(type: TypeApercu, revisionId: string): Promise<void> {
  const jeton = (await cookies()).get(NOM_COOKIE_CAPTURE)?.value;

  if (jeton) {
    const { BETTER_AUTH_SECRET } = await getEnv();
    const verdict = await verifierJetonDeCapture(
      BETTER_AUTH_SECRET,
      sujetApercu(type, revisionId),
      jeton,
    );
    if (verdict.valide) return;
    // Journalisé, jamais rendu : une page d'aperçu refusée se comporte comme
    // pour un visiteur ordinaire. Mais sans cette trace, une capture qui
    // ramène la page de connexion n'a aucune explication consultable.
    console.warn(`[apercu] laissez-passer refusé (${verdict.raison})`);
  }

  await requireAdmin();
}
