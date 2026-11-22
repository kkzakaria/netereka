/**
 * Saison des fêtes : QUAND l'habillage festif de la boutique s'affiche.
 *
 * Pour une nouvelle saison : changer `id`, `debut`, `finExclusive` et, une fois
 * connue, `dateLimiteLivraisonNoel`. L'`id` entre dans le nom du cookie de
 * fermeture du bandeau, si bien qu'un client qui l'a fermé l'an dernier le
 * revoit cette année.
 *
 * Les instants sont en UTC : Abidjan vit en UTC+0, sans heure d'été.
 *
 * `dateLimiteLivraisonNoel` est une promesse faite aux clients. Elle reste
 * `null` tant que l'équipe ne l'a pas fixée, et le bandeau n'annonce alors
 * aucune date.
 */
export interface Saison {
  id: string;
  /** ISO UTC, inclus. */
  debut: string;
  /** ISO UTC, exclu. */
  finExclusive: string;
  /** `YYYY-MM-DD`, ou `null` tant qu'elle n'est pas fixée. */
  dateLimiteLivraisonNoel: string | null;
}

export const SAISON_FETES: Saison = {
  id: "fetes-2026",
  debut: "2026-12-01T00:00:00Z",
  finExclusive: "2027-01-07T00:00:00Z",
  dateLimiteLivraisonNoel: null,
};

/** Cookie d'aperçu posé par `/api/saison/apercu`, honoré pour un admin seulement. */
export const NOM_COOKIE_APERCU = "netereka_apercu_saison";

export function saisonEnCours(maintenant: Date, saison: Saison = SAISON_FETES): boolean {
  const t = maintenant.getTime();
  return t >= Date.parse(saison.debut) && t < Date.parse(saison.finExclusive);
}

export function nomCookieBandeau(saison: Saison = SAISON_FETES): string {
  return `netereka_bandeau_ferme_${saison.id}`;
}

const FORMAT_JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function messageBandeau(saison: Saison = SAISON_FETES): string {
  if (!saison.dateLimiteLivraisonNoel) {
    return "Joyeuses fêtes ! Trouvez le cadeau high-tech idéal chez NETEREKA.";
  }
  const date = FORMAT_JOUR_MOIS.format(new Date(`${saison.dateLimiteLivraisonNoel}T00:00:00Z`));
  return `Joyeuses fêtes ! Commandez avant le ${date} pour être livré avant Noël.`;
}
