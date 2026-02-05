import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/utils/constants";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "À propos",
  description: `${SITE_NAME} est votre boutique en ligne d'électronique en Côte d'Ivoire. Découvrez notre histoire, notre mission et notre engagement pour une expérience d'achat de qualité.`,
  alternates: { canonical: "/a-propos" },
};

export default function AProposPage() {
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    name: SITE_NAME,
    "@id": SITE_URL,
    url: SITE_URL,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Abidjan",
      addressRegion: "Lagunes",
      addressCountry: "CI",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 5.3599517,
      longitude: -4.0082563,
    },
    priceRange: "$$",
    currenciesAccepted: "XOF",
    paymentAccepted: "Cash",
    areaServed: {
      "@type": "Country",
      name: "Côte d'Ivoire",
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={localBusinessSchema} />

      <h1 className="mb-8 text-3xl font-bold">À propos de {SITE_NAME}</h1>

      <div className="prose prose-sm max-w-none space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
        <section>
          <h2 className="text-xl font-semibold">Notre mission</h2>
          <p>
            {SITE_NAME} est née d&apos;une ambition simple : rendre l&apos;électronique
            accessible à tous en Côte d&apos;Ivoire. Nous croyons que chaque Ivoirien
            mérite d&apos;accéder à des produits technologiques de qualité, à des prix
            compétitifs, avec un service de livraison fiable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Qui sommes-nous ?</h2>
          <p>
            Basée à Abidjan, {SITE_NAME} est une boutique en ligne spécialisée dans la vente
            de produits électroniques. Nous proposons une large gamme de produits :
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Smartphones</strong> — iPhone, Samsung Galaxy, Xiaomi et bien d&apos;autres
            </li>
            <li>
              <strong>Ordinateurs</strong> — Portables et de bureau pour professionnels et particuliers
            </li>
            <li>
              <strong>Consoles de jeux</strong> — PlayStation, Xbox, Nintendo Switch
            </li>
            <li>
              <strong>Télévisions</strong> — Smart TV, LED, OLED des meilleures marques
            </li>
            <li>
              <strong>Tablettes</strong> — iPad, Samsung Galaxy Tab et plus
            </li>
            <li>
              <strong>Accessoires</strong> — Écouteurs, chargeurs, coques et périphériques
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Nos engagements</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-medium">Produits authentiques</h3>
              <p>
                Tous nos produits sont neufs et authentiques. Nous travaillons directement
                avec des fournisseurs agréés pour vous garantir des produits de qualité.
              </p>
            </div>
            <div>
              <h3 className="text-base font-medium">Prix compétitifs</h3>
              <p>
                Nous nous efforçons de proposer les meilleurs prix du marché ivoirien.
                Grâce à notre modèle en ligne, nous réduisons les coûts intermédiaires
                pour vous offrir des tarifs attractifs.
              </p>
            </div>
            <div>
              <h3 className="text-base font-medium">Livraison rapide</h3>
              <p>
                Notre propre flotte de livreurs assure une livraison rapide dans tout
                Abidjan, généralement sous 1 à 3 jours ouvrés. Le paiement s&apos;effectue
                à la livraison, en toute sécurité.
              </p>
            </div>
            <div>
              <h3 className="text-base font-medium">Service client réactif</h3>
              <p>
                Notre équipe est disponible 7 jours sur 7 pour répondre à vos questions
                et vous accompagner dans vos achats. Contactez-nous par WhatsApp pour une
                réponse rapide.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Pourquoi {SITE_NAME} ?</h2>
          <p>
            Le nom <strong>NETEREKA</strong> incarne notre vision : connecter la
            technologie aux consommateurs ivoiriens de manière simple, fiable et accessible.
            Dans un marché en pleine croissance numérique, nous voulons être le partenaire
            de confiance pour tous vos besoins en électronique.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Contactez-nous</h2>
          <p>
            Vous avez des questions ou des suggestions ? N&apos;hésitez pas à nous
            contacter via notre{" "}
            <Link href="/contact" className="text-primary hover:underline">
              page de contact
            </Link>
            . Nous sommes toujours à l&apos;écoute de nos clients.
          </p>
        </section>
      </div>
    </div>
  );
}
