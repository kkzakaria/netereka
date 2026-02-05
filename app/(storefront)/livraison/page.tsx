import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/utils/constants";

export const metadata: Metadata = {
  title: "Politique de Livraison",
  description: `Livraison rapide à Abidjan et en Côte d'Ivoire avec ${SITE_NAME}. Délais, zones couvertes, frais de livraison et suivi de commande.`,
  alternates: { canonical: "/livraison" },
};

export default function LivraisonPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">Politique de Livraison</h1>

      <div className="prose prose-sm max-w-none space-y-8 text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
        <section>
          <h2 className="text-xl font-semibold">Zones de livraison</h2>
          <p>
            {SITE_NAME} assure la livraison dans la ville d&apos;Abidjan et ses communes
            environnantes grâce à notre propre flotte de livreurs. Nous couvrons
            l&apos;ensemble des communes de la ville d&apos;Abidjan, notamment :
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Cocody</li>
            <li>Plateau</li>
            <li>Marcory</li>
            <li>Treichville</li>
            <li>Yopougon</li>
            <li>Abobo</li>
            <li>Adjamé</li>
            <li>Koumassi</li>
            <li>Port-Bouët</li>
            <li>Bingerville</li>
            <li>Et d&apos;autres communes de la zone Grand Abidjan</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Délais de livraison</h2>
          <p>
            Nos délais de livraison sont estimés entre <strong>1 et 3 jours ouvrés</strong>{" "}
            à partir de la confirmation de votre commande. Les délais peuvent varier en
            fonction de :
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>La zone de livraison (commune)</li>
            <li>La disponibilité du produit</li>
            <li>Le volume de commandes en cours</li>
          </ul>
          <p>
            Vous recevrez des notifications à chaque étape du processus : confirmation de
            commande, préparation, expédition et livraison.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Frais de livraison</h2>
          <p>
            Les frais de livraison sont calculés automatiquement en fonction de votre commune
            de livraison. Le montant exact vous est communiqué au moment de la validation de
            votre commande, avant le paiement.
          </p>
          <p>
            Les frais varient généralement entre <strong>1 000 FCFA et 3 000 FCFA</strong>{" "}
            selon la commune de livraison.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Paiement à la livraison</h2>
          <p>
            Chez {SITE_NAME}, le paiement s&apos;effectue exclusivement à la livraison. Vous
            payez en espèces le montant total de votre commande (produits + frais de
            livraison) directement au livreur lors de la réception de votre colis.
          </p>
          <p>
            Notre livreur vous remet un reçu de paiement après encaissement. Veuillez
            préparer le montant exact si possible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Suivi de commande</h2>
          <p>
            Vous pouvez suivre l&apos;état de votre commande à tout moment depuis votre
            espace client. Les statuts possibles sont :
          </p>
          <ol className="list-decimal space-y-1 pl-6">
            <li>
              <strong>En attente</strong> — Votre commande a été reçue
            </li>
            <li>
              <strong>Confirmée</strong> — Votre commande a été validée par notre équipe
            </li>
            <li>
              <strong>En préparation</strong> — Votre commande est en cours de préparation
            </li>
            <li>
              <strong>En livraison</strong> — Un livreur est en route vers votre adresse
            </li>
            <li>
              <strong>Livrée</strong> — Votre commande a été livrée avec succès
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Réception de la commande</h2>
          <p>
            Lors de la livraison, nous vous recommandons de vérifier l&apos;état de
            l&apos;emballage et du produit en présence du livreur. En cas de dommage visible,
            vous pouvez refuser la livraison ou émettre des réserves.
          </p>
          <p>
            Si vous constatez un problème après ouverture du colis, contactez notre service
            client dans les 48 heures suivant la réception.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Absence lors de la livraison</h2>
          <p>
            Si vous êtes absent lors du passage du livreur, celui-ci vous contactera par
            téléphone. Un second passage pourra être programmé dans un délai convenu. Après
            deux tentatives infructueuses, la commande pourra être annulée.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p>
            Pour toute question relative à votre livraison, n&apos;hésitez pas à nous
            contacter via notre{" "}
            <Link href="/contact" className="text-primary hover:underline">
              page de contact
            </Link>{" "}
            ou par WhatsApp.
          </p>
        </section>
      </div>
    </div>
  );
}
