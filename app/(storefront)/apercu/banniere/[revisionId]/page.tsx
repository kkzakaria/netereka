import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { getRevision } from "@/lib/db/revisions";
import { getBannerById } from "@/lib/db/banners";
import { bannerClock, getActiveBanners, sanitizeBannerContent } from "@/lib/db/storefront/banners";
import { banniereApresRevision, carrouselApresRevision } from "@/lib/revisions/apercu-banniere";
import { HeroBanner } from "@/components/storefront/hero-banner";
import type { Banner } from "@/lib/db/types";

/**
 * À quoi ressemblera une bannière SI cette révision est appliquée.
 *
 * Pourquoi cette page existe. Avant elle, un auteur — l'assistant comme
 * l'administrateur — ne pouvait voir que deux choses : ce qui est EN LIGNE,
 * et l'aperçu de l'écran d'édition, en 624 × 240 avec sa propre copie du CSS.
 * Ni l'un ni l'autre ne répond à « à quoi ressemblera ce que je propose »,
 * puisqu'une révision n'est nulle part tant qu'elle n'est pas appliquée.
 *
 * CE QUI LA REND FIDÈLE, et c'est tout l'enjeu :
 *  - elle monte le VRAI `HeroBanner`, pas une reproduction ;
 *  - elle charge le vrai `globals.css` (la mise en page du site), puisqu'elle
 *    vit dans la même application ;
 *  - elle ré-assainit le contenu par `sanitizeBannerContent`, exactement comme
 *    `getActiveBanners` le fait pour la vitrine — un aperçu qui montrerait du
 *    HTML non assaini mentirait sur ce que le visiteur verra ;
 *  - elle n'impose AUCUNE largeur. Les paliers du hero (280 / 400 / 480 px)
 *    répondent à la largeur du VIEWPORT, pas à celle d'un conteneur : forcer
 *    une largeur ici rendrait toujours le palier du poste qui regarde. Pour
 *    voir le mobile, on rétrécit la fenêtre — ou on demande la capture au
 *    viewport voulu.
 *
 * ELLE VIT DANS LE GROUPE `(storefront)`, et c'est un choix : elle hérite
 * ainsi du VRAI gabarit de la vitrine — en-tête collant, pied de page,
 * fournisseur WhatsApp, tiroir du panier. Une bannière se juge sous son
 * en-tête, pas dans le vide : le haut de la diapositive passe sous une barre
 * collante, et c'est précisément ce qu'on veut voir. Reproduire ce gabarit
 * dans une page isolée aurait créé une seconde composition, vouée à dériver
 * de la première.
 *
 * Ce qu'on y perd, et qui est assumé : les futures captures porteront
 * l'en-tête et le bandeau de cookies. C'est aussi ce que voit le visiteur.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aperçu de révision",
  // Une page d'administration qui rend du contenu non publié n'a rien à faire
  // dans un index, même protégée.
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ revisionId: string }>;
}

export default async function ApercuRevisionBanniere({ params }: Props) {
  await requireAdmin();

  const { revisionId } = await params;
  const revision = await getRevision(revisionId);
  if (!revision || revision.target_type !== "banner") notFound();

  const courante = await getBannerById(Number(revision.target_id));
  // La cible a pu disparaître depuis le dépôt : il n'y a alors rien à montrer,
  // et un rendu vide serait plus trompeur qu'un 404.
  if (!courante) notFound();

  const apres = banniereApresRevision(courante as unknown as Banner, revision);

  // LE CARROUSEL ENTIER, pas la diapositive seule : une bannière ne se juge
  // pas hors de son voisinage — son rang, ce qui la précède, ce qui la suit,
  // les puces. Et pour un retrait, c'est le carrousel AMPUTÉ qu'il faut voir
  // avant d'appliquer.
  const affichees = await getActiveBanners();
  const carrousel = carrouselApresRevision(affichees, apres, bannerClock());

  // Ré-assaini comme la vitrine le fait : les voisines le sont déjà par
  // `getActiveBanners`, la révisée ne l'est pas encore.
  const assainies = sanitizeBannerContent(carrousel);

  // Pas de <main> ici : le gabarit de la vitrine en fournit déjà un.
  return <HeroBanner banners={assainies} fallbackProducts={[]} />;
}
