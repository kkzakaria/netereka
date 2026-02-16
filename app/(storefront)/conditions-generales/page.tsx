export const revalidate = 86400;

import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/utils/constants";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente",
  description: `Consultez les conditions générales de vente de ${SITE_NAME}. Informations sur les commandes, paiements, livraisons et retours en Côte d'Ivoire.`,
  alternates: { canonical: "/conditions-generales" },
};

export default function CGVPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">Conditions Générales de Vente</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Dernière mise à jour : février 2026
      </p>

      <div className="prose prose-sm max-w-none space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
        <section>
          <h2 className="text-xl font-semibold">1. Objet</h2>
          <p>
            Les présentes Conditions Générales de Vente (CGV) régissent les relations
            contractuelles entre {SITE_NAME}, société de commerce électronique basée à
            Abidjan, Côte d&apos;Ivoire, et toute personne physique ou morale effectuant un
            achat sur le site{" "}
            <Link href="/" className="text-primary hover:underline">
              {SITE_URL}
            </Link>
            .
          </p>
          <p>
            En passant commande sur notre site, le client reconnaît avoir pris connaissance
            des présentes CGV et les accepter sans réserve.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Produits</h2>
          <p>
            {SITE_NAME} propose à la vente des produits électroniques neufs : smartphones,
            ordinateurs, tablettes, consoles de jeux, télévisions, accessoires et
            périphériques.
          </p>
          <p>
            Les photographies et descriptions des produits sont aussi fidèles que possible.
            Toutefois, de légères différences peuvent exister entre la photo et le produit
            livré (couleur, emballage). Ces différences ne sauraient engager la
            responsabilité de {SITE_NAME}.
          </p>
          <p>
            Tous les produits sont vendus dans la limite des stocks disponibles. En cas
            d&apos;indisponibilité après validation de la commande, le client sera informé
            dans les plus brefs délais et pourra choisir un produit de remplacement ou
            annuler sa commande.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Prix</h2>
          <p>
            Les prix sont indiqués en Francs CFA (XOF), toutes taxes comprises (TTC). Les
            frais de livraison sont calculés séparément en fonction de la zone de livraison
            et affichés au moment de la validation de la commande.
          </p>
          <p>
            {SITE_NAME} se réserve le droit de modifier ses prix à tout moment. Les produits
            seront facturés sur la base du tarif en vigueur au moment de la validation de la
            commande.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Commande</h2>
          <p>Le processus de commande se déroule comme suit :</p>
          <ol className="list-decimal space-y-1 pl-6">
            <li>Sélection des produits et ajout au panier</li>
            <li>Création d&apos;un compte client ou connexion</li>
            <li>Choix de l&apos;adresse de livraison et de la zone</li>
            <li>Application éventuelle d&apos;un code promotionnel</li>
            <li>Vérification du récapitulatif de commande</li>
            <li>Validation de la commande</li>
          </ol>
          <p>
            Un email de confirmation est envoyé au client après validation de la commande.
            Un numéro de commande unique (format ORD-XXXXXX) lui est attribué pour le suivi.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Paiement</h2>
          <p>
            Le paiement s&apos;effectue exclusivement à la livraison (paiement à la
            livraison / Cash on Delivery). Le client règle le montant total de sa commande
            (produits + frais de livraison) en espèces au moment de la réception.
          </p>
          <p>
            Le livreur remet un reçu de paiement au client après encaissement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Livraison</h2>
          <p>
            La livraison est assurée par notre flotte de livreurs dans la zone d&apos;Abidjan
            et ses environs. Les délais de livraison estimés sont de 1 à 3 jours ouvrés selon
            la zone.
          </p>
          <p>
            Les frais de livraison varient selon la commune de livraison et sont clairement
            affichés lors de la commande. Pour plus de détails, consultez notre{" "}
            <Link href="/livraison" className="text-primary hover:underline">
              politique de livraison
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Droit de rétractation et retours</h2>
          <p>
            Conformément à la réglementation en vigueur en Côte d&apos;Ivoire, le client
            dispose d&apos;un délai de 48 heures après réception pour signaler tout défaut
            ou non-conformité du produit.
          </p>
          <p>Le retour est accepté dans les cas suivants :</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Produit défectueux à la réception</li>
            <li>Produit non conforme à la commande</li>
            <li>Produit endommagé durant le transport</li>
          </ul>
          <p>
            Le produit doit être retourné dans son emballage d&apos;origine, complet et non
            utilisé. Après vérification, {SITE_NAME} procédera à l&apos;échange ou au
            remboursement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Garantie</h2>
          <p>
            Tous les produits vendus par {SITE_NAME} bénéficient de la garantie
            constructeur. La durée de garantie varie selon le produit et la marque. Les
            conditions de garantie sont précisées sur la fiche produit.
          </p>
          <p>
            La garantie ne couvre pas les dommages résultant d&apos;une mauvaise utilisation,
            d&apos;une négligence, d&apos;une modification ou d&apos;une réparation non
            autorisée.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Protection des données personnelles</h2>
          <p>
            {SITE_NAME} s&apos;engage à protéger les données personnelles de ses clients. Les
            informations collectées sont nécessaires au traitement des commandes et à
            l&apos;amélioration de nos services.
          </p>
          <p>
            Ces données ne sont en aucun cas cédées ou vendues à des tiers. Le client dispose
            d&apos;un droit d&apos;accès, de rectification et de suppression de ses données
            personnelles, qu&apos;il peut exercer via son espace client ou en contactant
            notre service client. Pour plus de détails, consultez notre{" "}
            <Link href="/politique-confidentialite" className="text-primary hover:underline">
              politique de confidentialité
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des éléments du site {SITE_NAME} (textes, images, logos, icônes,
            logiciels) sont protégés par le droit de la propriété intellectuelle. Toute
            reproduction, représentation ou diffusion, en tout ou partie, du contenu de ce
            site est interdite sans autorisation préalable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">11. Litiges</h2>
          <p>
            Les présentes CGV sont soumises au droit ivoirien. En cas de litige, les parties
            s&apos;engagent à rechercher une solution amiable. À défaut, les tribunaux
            compétents d&apos;Abidjan seront seuls compétents.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">12. Contact</h2>
          <p>
            Pour toute question relative à ces conditions générales, vous pouvez nous
            contacter via notre{" "}
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
