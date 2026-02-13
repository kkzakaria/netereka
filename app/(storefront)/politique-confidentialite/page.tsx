import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/utils/constants";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description: `Découvrez comment ${SITE_NAME} collecte, utilise et protège vos données personnelles. Vos droits et notre engagement pour la protection de votre vie privée.`,
  alternates: { canonical: "/politique-confidentialite" },
};

export default function PolitiqueConfidentialitePage() {
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Politique de Confidentialité",
    description: `Découvrez comment ${SITE_NAME} collecte, utilise et protège vos données personnelles.`,
    url: `${SITE_URL}/politique-confidentialite`,
    inLanguage: "fr",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={webPageSchema} />
      <h1 className="mb-8 text-3xl font-bold">Politique de Confidentialité</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Dernière mise à jour : février 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
        <section>
          <h2 className="text-xl font-semibold">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données personnelles collectées sur le site{" "}
            <Link href="/" className="text-primary hover:underline">
              {SITE_URL}
            </Link>{" "}
            est {SITE_NAME}, société de commerce électronique basée à Abidjan, Côte
            d&apos;Ivoire.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Données collectées</h2>
          <p>
            Dans le cadre de notre activité, nous collectons les données personnelles
            suivantes :
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Données d&apos;identification</strong> — nom, prénom, adresse email,
              numéro de téléphone
            </li>
            <li>
              <strong>Données de livraison</strong> — adresse postale, commune, zone de
              livraison
            </li>
            <li>
              <strong>Données de commande</strong> — produits commandés, montants, historique
              des achats
            </li>
            <li>
              <strong>Données de compte</strong> — mot de passe (stocké sous forme chiffrée),
              préférences, liste de souhaits, avis
            </li>
            <li>
              <strong>Données de connexion</strong> — adresse IP, type de navigateur, pages
              visitées (à des fins de sécurité)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Finalités du traitement</h2>
          <p>Vos données personnelles sont utilisées pour :</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Créer et gérer votre compte client</li>
            <li>Traiter et suivre vos commandes</li>
            <li>Assurer la livraison de vos produits</li>
            <li>
              Vous envoyer des notifications relatives à vos commandes (confirmation,
              expédition, livraison)
            </li>
            <li>Gérer le service après-vente et répondre à vos demandes</li>
            <li>Améliorer nos services et votre expérience d&apos;achat</li>
            <li>Assurer la sécurité de notre plateforme et prévenir la fraude</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Base légale du traitement</h2>
          <p>Le traitement de vos données repose sur :</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>L&apos;exécution du contrat</strong> — pour le traitement de vos
              commandes et la livraison
            </li>
            <li>
              <strong>Votre consentement</strong> — lors de la création de votre compte et
              pour les communications marketing
            </li>
            <li>
              <strong>L&apos;intérêt légitime</strong> — pour la sécurité de la plateforme
              et la prévention de la fraude
            </li>
            <li>
              <strong>Les obligations légales</strong> — pour la conservation des données
              de facturation
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Partage des données</h2>
          <p>
            {SITE_NAME} ne vend, ne loue et ne cède en aucun cas vos données personnelles
            à des tiers à des fins commerciales.
          </p>
          <p>
            Vos données peuvent être partagées uniquement avec les prestataires techniques
            nécessaires au fonctionnement du service :
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Cloudflare</strong> — hébergement et sécurité du site
            </li>
            <li>
              <strong>Resend</strong> — envoi des emails transactionnels (confirmations de
              commande, notifications)
            </li>
            <li>
              <strong>Google Analytics</strong> — mesure d&apos;audience anonymisée
              (uniquement si vous avez donné votre consentement via le bandeau cookies)
            </li>
          </ul>
          <p>
            Ces prestataires n&apos;ont accès qu&apos;aux données strictement nécessaires à
            l&apos;exécution de leur service et s&apos;engagent à les protéger.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Durée de conservation</h2>
          <p>Vos données sont conservées selon les durées suivantes :</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Données de compte</strong> — tant que votre compte est actif, puis 3 ans
              après la dernière activité
            </li>
            <li>
              <strong>Données de commande</strong> — 5 ans à compter de la commande,
              conformément aux obligations comptables et fiscales
            </li>
            <li>
              <strong>Données de connexion</strong> — 12 mois maximum
            </li>
          </ul>
          <p>
            À l&apos;expiration de ces délais, vos données sont supprimées ou anonymisées.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Vos droits</h2>
          <p>
            Conformément à la loi n°2013-450 du 19 juin 2013 relative à la protection
            des données à caractère personnel en Côte d&apos;Ivoire, vous disposez des
            droits suivants sur vos données personnelles :
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Droit d&apos;accès</strong> — obtenir une copie de vos données
              personnelles
            </li>
            <li>
              <strong>Droit de rectification</strong> — corriger des données inexactes ou
              incomplètes
            </li>
            <li>
              <strong>Droit de suppression</strong> — demander la suppression de vos données
            </li>
            <li>
              <strong>Droit d&apos;opposition</strong> — vous opposer au traitement de vos
              données pour des motifs légitimes
            </li>
          </ul>
          <p>
            Vous pouvez exercer ces droits directement depuis votre{" "}
            <Link href="/account" className="text-primary hover:underline">
              espace client
            </Link>{" "}
            ou en nous contactant via notre{" "}
            <Link href="/contact" className="text-primary hover:underline">
              page de contact
            </Link>
            . Nous nous engageons à répondre à votre demande dans un délai de 30 jours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Cookies</h2>
          <p>Notre site utilise deux catégories de cookies :</p>
          <h3 className="mt-3 text-base font-medium">
            Cookies nécessaires (toujours actifs)
          </h3>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Cookie de session</strong> — maintient votre connexion active (durée :
              7 jours)
            </li>
            <li>
              <strong>Préférences</strong> — thème d&apos;affichage (clair/sombre), contenu
              du panier
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Ces cookies sont indispensables au fonctionnement du site et ne peuvent pas être
            désactivés.
          </p>
          <h3 className="mt-3 text-base font-medium">
            Cookies analytiques (soumis à votre consentement)
          </h3>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Google Analytics 4</strong> — nous aide à comprendre comment vous utilisez
              le site afin de l&apos;améliorer. Ces cookies collectent des données anonymisées
              sur les pages visitées et les interactions.
            </li>
          </ul>
          <p>
            Les cookies analytiques ne sont déposés qu&apos;après votre consentement explicite
            via le bandeau affiché lors de votre première visite. Vous pouvez modifier votre
            choix à tout moment depuis le lien « Gérer les cookies » en pied de page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Sécurité des données</h2>
          <p>
            {SITE_NAME} met en place des mesures techniques et organisationnelles pour
            protéger vos données personnelles :
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Connexion sécurisée HTTPS sur l&apos;ensemble du site</li>
            <li>Mots de passe chiffrés (hachage cryptographique)</li>
            <li>Accès aux données restreint au personnel autorisé</li>
            <li>
              Protection contre les attaques automatisées (Cloudflare Turnstile)
            </li>
            <li>Hébergement sur infrastructure sécurisée (Cloudflare Workers)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Modifications</h2>
          <p>
            {SITE_NAME} se réserve le droit de modifier la présente politique de
            confidentialité à tout moment. En cas de modification substantielle, nous vous
            en informerons par email ou via une notification sur le site. La date de
            dernière mise à jour est indiquée en haut de cette page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">11. Contact</h2>
          <p>
            Pour toute question relative à la protection de vos données personnelles, vous
            pouvez nous contacter via notre{" "}
            <Link href="/contact" className="text-primary hover:underline">
              page de contact
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
