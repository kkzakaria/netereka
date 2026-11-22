import { FermerBandeau } from "@/components/storefront/saison/fermer-bandeau";
import { SAISON_FETES, messageBandeau, nomCookieBandeau } from "@/lib/saison/config";

const UN_JOUR = 86400;

/** Le cookie de fermeture vit jusqu'à la fin de la saison (au moins un jour). */
function dureeJusquaFinDeSaison(): number {
  const restant = Math.floor((Date.parse(SAISON_FETES.finExclusive) - Date.now()) / 1000);
  return Math.max(restant, UN_JOUR);
}

export function BandeauFetes({ apercu }: { apercu: boolean }) {
  return (
    <div
      data-slot="bandeau-fetes"
      role="region"
      aria-label="Message des fêtes"
      className="bg-festif-bandeau text-festif-bandeau-foreground"
    >
      {/* Marges égales des deux côtés (≥ la largeur du bouton) : le message
          reste centré sur la page, le bouton ne le pousse pas. */}
      <div className="relative mx-auto max-w-7xl px-12 py-0.5 text-sm">
        <p className="py-2 text-center">
          <span aria-hidden="true" className="mr-2 text-festif-or">
            ✦
          </span>
          {messageBandeau()}
          {apercu && (
            <span className="ml-2 rounded bg-festif-or px-1.5 py-0.5 text-xs font-semibold text-black">
              Aperçu — invisible pour les clients
            </span>
          )}
        </p>
        <div className="absolute top-1/2 right-1 -translate-y-1/2">
          <FermerBandeau nomCookie={nomCookieBandeau()} maxAgeSecondes={dureeJusquaFinDeSaison()} />
        </div>
      </div>
    </div>
  );
}
