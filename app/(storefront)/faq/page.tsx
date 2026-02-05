import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/utils/constants";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "FAQ - Questions fréquentes",
  description: `Trouvez les réponses à vos questions sur ${SITE_NAME} : commandes, livraison, paiement, retours et bien plus. Aide et support client.`,
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    question: "Comment passer une commande ?",
    answer:
      "Parcourez notre catalogue, ajoutez les produits souhaités à votre panier, puis rendez-vous sur la page de commande. Renseignez votre adresse de livraison, vérifiez votre récapitulatif et validez. Vous recevrez un email de confirmation avec votre numéro de commande.",
  },
  {
    question: "Quels sont les modes de paiement acceptés ?",
    answer:
      "Nous acceptons uniquement le paiement à la livraison (Cash on Delivery). Vous réglez le montant total de votre commande en espèces directement au livreur lors de la réception de votre colis.",
  },
  {
    question: "Quels sont les délais de livraison ?",
    answer:
      "La livraison est effectuée sous 1 à 3 jours ouvrés dans la zone d'Abidjan et ses environs. Les délais peuvent varier selon la commune de livraison et la disponibilité des produits.",
  },
  {
    question: "Quels sont les frais de livraison ?",
    answer:
      "Les frais de livraison varient entre 1 000 FCFA et 3 000 FCFA selon votre commune. Le montant exact vous est communiqué au moment de la commande.",
  },
  {
    question: "Comment suivre ma commande ?",
    answer:
      "Connectez-vous à votre espace client et accédez à la section « Mes commandes ». Vous y trouverez le statut en temps réel de votre commande. Vous recevrez également des notifications par email à chaque étape.",
  },
  {
    question: "Puis-je annuler ou modifier ma commande ?",
    answer:
      "Vous pouvez annuler votre commande tant qu'elle n'est pas en cours de livraison. Connectez-vous à votre espace client ou contactez notre service client pour toute modification.",
  },
  {
    question: "Que faire si mon produit est défectueux ?",
    answer:
      "Si vous recevez un produit défectueux ou non conforme, contactez notre service client dans les 48 heures suivant la réception. Nous procéderons à un échange ou un remboursement après vérification.",
  },
  {
    question: "Les produits sont-ils neufs et authentiques ?",
    answer:
      "Oui, tous les produits vendus sur NETEREKA sont neufs et authentiques. Nous travaillons avec des fournisseurs agréés pour garantir l'authenticité de chaque article.",
  },
  {
    question: "Proposez-vous une garantie sur les produits ?",
    answer:
      "Tous nos produits bénéficient de la garantie constructeur. La durée et les conditions de garantie sont précisées sur chaque fiche produit.",
  },
  {
    question: "Comment créer un compte ?",
    answer:
      "Cliquez sur « S'inscrire » en haut de la page. Renseignez votre nom, votre email et un mot de passe. Votre compte est créé instantanément et vous pouvez commencer à commander.",
  },
  {
    question: "Comment utiliser un code promo ?",
    answer:
      "Lors de la validation de votre commande, saisissez votre code promotionnel dans le champ prévu à cet effet et cliquez sur « Appliquer ». La réduction sera calculée automatiquement.",
  },
  {
    question: "Comment contacter le service client ?",
    answer:
      "Vous pouvez nous contacter via notre page de contact, par WhatsApp, ou par email. Notre équipe est disponible 7 jours sur 7 pour répondre à vos questions.",
  },
];

export default function FAQPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={faqSchema} />

      <h1 className="mb-2 text-3xl font-bold">Questions fréquentes</h1>
      <p className="mb-8 text-muted-foreground">
        Trouvez rapidement les réponses à vos questions les plus courantes.
      </p>

      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <details
            key={index}
            className="group rounded-lg border p-4"
          >
            <summary className="cursor-pointer text-sm font-medium text-foreground marker:text-primary">
              {faq.question}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>

      <div className="mt-10 rounded-lg border bg-muted/30 p-6 text-center">
        <h2 className="text-lg font-semibold">Vous n&apos;avez pas trouvé votre réponse ?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Notre équipe est là pour vous aider. Contactez-nous directement.
        </p>
        <a
          href="/contact"
          className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Nous contacter
        </a>
      </div>
    </div>
  );
}
