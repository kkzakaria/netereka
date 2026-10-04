import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { getRevision } from "@/lib/db/revisions";
import { getAdminProductById } from "@/lib/db/admin/products";
import { produitApresRevision } from "@/lib/revisions/apercu-produit";
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
 * CE QUI N'EST PAS RENDU, et pourquoi : ni le prix, ni les images, ni les
 * variantes. Une révision `update` ne touche que des colonnes de `products`,
 * et les natures enfant (`add_images`, `set_variants`) n'écrivent aucune
 * colonne — les montrer ferait croire que cet écran juge quelque chose qu'il
 * ne sait pas composer. Ce qu'on vient juger ici, c'est le contenu éditorial.
 *
 * Les avis sont absents pour la même raison : ils ne sont jamais l'objet
 * d'une révision. `hasReviews` vaut donc false, et la section ne s'affiche
 * que si la fiche a autre chose à montrer.
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

  // Pas de <main> ici : le gabarit de la vitrine en fournit déjà un. La
  // largeur reprend celle de la vraie fiche produit (max-w-7xl px-4), pour
  // que la description soit jugée à la mesure où elle sera lue.
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold">{apres.name}</h1>
      <ProductDetails
          description={apres.description}
          descriptionType={apres.description_type}
          faqHtml={apres.faq_html}
          productId={apres.id}
          attributes={apres.attributes}
          hasReviews={false}
          reviews={null}
      />
    </div>
  );
}
