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
      <div className="mx-auto flex max-w-7xl items-center gap-2 py-0.5 pl-4 pr-1 text-sm">
        <span aria-hidden="true" className="text-festif-or">
          ✦
        </span>
        <p className="flex-1 py-2">
          {messageBandeau()}
          {apercu && (
            <span className="ml-2 rounded bg-festif-or px-1.5 py-0.5 text-xs font-semibold text-black">
              Aperçu — invisible pour les clients
            </span>
          )}
        </p>
        <FermerBandeau nomCookie={nomCookieBandeau()} maxAgeSecondes={dureeJusquaFinDeSaison()} />
      </div>
    </div>
  );
}
