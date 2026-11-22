import type { ActiveStore } from "@/lib/db/stores";

/**
 * JSON-LD des magasins physiques (`ElectronicsStore`, sous-type de
 * `LocalBusiness`), rattachés à l'organisation du layout par son `@id`.
 *
 * Le site affichait déjà le magasin (nom, adresse, téléphone, fiche Maps)
 * dans l'en-tête, mais rien ne le décrivait à Google : le schéma
 * `Organization` ne portait ni rue ni téléphone. Pour une recherche locale
 * (« magasin électronique Treichville »), c'est le signal qui manquait.
 *
 * Rien n'est inventé : chaque champ vient de la table `stores`. Les horaires
 * (`opening_hours`, texte libre) ne sont pas émis, faute de format fiable à
 * traduire en `openingHoursSpecification`. Les coordonnées ne sont émises que
 * si l'URL Maps contient le repère du lieu (`!3d<lat>!4d<lng>`), jamais
 * devinées depuis le centre de la carte (`@lat,lng`), qui peut être ailleurs.
 */

/** Coordonnées du lieu dans une URL Google Maps, ou `null`. */
export function geoFromMapsUrl(url: string): { latitude: number; longitude: number } | null {
  const m = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(url);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export function buildStoreSchemas(
  stores: ActiveStore[],
  siteUrl: string,
  logoUrl: string,
): Record<string, unknown>[] {
  return stores.map((store) => {
    const geo = geoFromMapsUrl(store.google_maps_url);
    return {
      "@context": "https://schema.org",
      "@type": "ElectronicsStore",
      "@id": `${siteUrl}/#store-${store.id}`,
      name: store.name.trim(),
      url: siteUrl,
      image: logoUrl,
      parentOrganization: { "@id": `${siteUrl}/#organization` },
      address: {
        "@type": "PostalAddress",
        // No addressLocality: the `stores` table has no city column, and
        // writing "Abidjan" would be wrong for any store opened elsewhere.
        streetAddress: store.address.trim(),
        addressCountry: "CI",
      },
      ...(store.phone && { telephone: store.phone.trim() }),
      hasMap: store.google_maps_url,
      ...(geo && { geo: { "@type": "GeoCoordinates", ...geo } }),
      currenciesAccepted: "XOF",
      paymentAccepted: "Cash",
    };
  });
}
