import { cookies } from "next/headers";
import { getOptionalSession } from "@/lib/auth/guards";
import { NOM_COOKIE_APERCU, nomCookieBandeau, saisonEnCours } from "@/lib/saison/config";

export interface EtatSaison {
  /** L'habillage festif est posé sur la boutique. */
  festif: boolean;
  /** Le bandeau d'annonce est rendu (le client ne l'a pas fermé). */
  bandeauVisible: boolean;
  /** Affiché hors saison pour un admin seulement : le bandeau le signale. */
  apercu: boolean;
}

export function resoudreEtatSaison(e: {
  maintenant: Date;
  apercuAdmin: boolean;
  bandeauFerme: boolean;
}): EtatSaison {
  const enCours = saisonEnCours(e.maintenant);
  const festif = enCours || e.apercuAdmin;
  return {
    festif,
    bandeauVisible: festif && !e.bandeauFerme,
    apercu: e.apercuAdmin && !enCours,
  };
}

/**
 * Décidé côté serveur, à chaque requête : jamais d'après l'horloge du
 * navigateur, qui varie d'un appareil à l'autre et provoquerait un écart
 * d'hydratation.
 *
 * La session n'est lue que si le cookie d'aperçu est présent : un visiteur
 * ordinaire ne paie aucune requête de plus.
 */
export async function getEtatSaison(): Promise<EtatSaison> {
  const jar = await cookies();
  let apercuAdmin = false;
  if (jar.get(NOM_COOKIE_APERCU)) {
    try {
      const role = (await getOptionalSession())?.user.role;
      apercuAdmin = role === "admin" || role === "super_admin";
    } catch (error) {
      console.error("[saison] lecture de session impossible pour l'aperçu :", error);
    }
  }
  return resoudreEtatSaison({
    maintenant: new Date(),
    apercuAdmin,
    bandeauFerme: Boolean(jar.get(nomCookieBandeau())),
  });
}
