import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { getRevision } from "@/lib/db/revisions";
import { getAdminProductById } from "@/lib/db/admin/products";
import { produitApresRevision, champsNonRendus } from "@/lib/revisions/apercu-produit";
import { avertissementsApercu } from "@/lib/revisions/apercu-avertissements";
import { ApercuAvertissements } from "@/components/admin/apercu-avertissements";
import { ProductDetails } from "@/components/storefront/product-details";

/**
 * À quoi ressemblera une fiche produit SI cette révision est appliquée.
 *
 * Jumelle de l'aperçu de bannière, et pour la même raison : la description
 * d'un produit est du HTML LIBRE — celui que l'assistant compose — et une
 * révision n'est nulle part tant qu'elle n'est pas appliquée. Son auteur ne
 * pouvait voir que la fiche EN LIGNE, c'est-à-dire l'ancienne.
 *
 * CE QUI EST RENDU : la section Description / FAQ / Caractéristiques de la
 * vitrine, par le VRAI `ProductDetails` — donc avec ses onglets réels, sa
 * décision de n'afficher un onglet que s'il a du contenu, et son
 * assainissement. Celui-ci n'est pas refait ici : `descriptionToHtml` et
 * `ProductDetails` assainissent déjà, chacun avec la portée du produit. Le
 * refaire au-dessus donnerait l'illusion d'une garantie supplémentaire là où
 * il n'y en a qu'une — et masquerait le jour où l'une des deux la perdrait.
 *
 * CE QUI N'EST PAS RENDU : ni le prix, ni le stock, ni les images, ni les
 * variantes. Les images et les variantes vivent dans des tables enfant que
 * cet écran ne sait pas composer. Le prix, lui, EST une colonne de
 * `products` — il est donc fusionné, et le taire serait le mensonge le plus
 * coûteux de tous : une révision qui passe un prix de 15 000 à 1 500 XOF
 * s'afficherait sans que rien ne la signale. D'où `champsNonRendus`, qui
 * NOMME à l'écran ce que la révision change et que la page ne montre pas.
 *
 * Les avis ne sont jamais l'objet d'une révision. Mais `visibleProductTabs`
 * ajoute TOUJOURS l'onglet « Avis » : le laisser sans panneau donnait un
 * onglet vide, qu'un administrateur lirait comme « cette fiche n'a plus
 * d'avis ». On y écrit donc pourquoi il est vide, plutôt que de laisser le
 * silence répondre à sa place.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aperçu de révision",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ revisionId: string }>;
}

export default async function ApercuRevisionProduit({ params }: Props) {
  await requireAdmin();

  const { revisionId } = await params;
  const revision = await getRevision(revisionId);
  if (!revision || revision.target_type !== "product") notFound();

  const courant = await getAdminProductById(revision.target_id);
  // La cible a pu disparaître depuis le dépôt : un rendu vide serait plus
  // trompeur qu'un 404.
  if (!courant) notFound();

  const apres = produitApresRevision(courant, revision);

  const avertissements = [
    ...avertissementsApercu({ revision, versionActuelle: courant.updated_at }),
    ...champsNonRendus(revision).map((message) => ({ message, bloquant: false })),
  ];

  // Pas de <main> ici : le gabarit de la vitrine en fournit déjà un. La
  // largeur reprend celle de la vraie fiche produit (max-w-7xl px-4), pour
  // que la description soit jugée à la mesure où elle sera lue.
  return (
    <>
      <ApercuAvertissements avertissements={avertissements} />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="text-2xl font-bold">{apres.name}</h1>
        <ProductDetails
          description={apres.description}
          descriptionType={apres.description_type}
          faqHtml={apres.faq_html}
          productId={apres.id}
          attributes={apres.attributes}
          hasReviews
          reviews={
            <p className="text-sm text-muted-foreground">
              Les avis ne sont pas montrés dans un aperçu : ils ne sont jamais l&apos;objet d&apos;une révision.
            </p>
          }
        />
      </div>
    </>
  );
}
