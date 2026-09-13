import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";
import { parseHighlights, parseFeatureBlocks, parseFaq } from "@/lib/utils/product-story";
import { descriptionToHtml } from "@/lib/utils/description-to-html";
import { storyToHtml, faqToHtml } from "@/lib/content/story-to-html";
import { bannerTemplateToHtml } from "@/lib/content/banner-to-html";

/**
 * Décide, pour une ligne donnée, ce que la conversion doit écrire.
 *
 * Tout le jugement est ici ; scripts/convert-content-to-html.ts n'est qu'une
 * coquille qui lit la base, appelle ces fonctions et écrit le résultat. Ce
 * découpage existe pour une raison simple : un CLI n'est pas testable dans ce
 * dépôt, une fonction pure l'est.
 */

export interface ProductRow {
  id: string;
  description: string | null;
  description_type: string;
  tagline: string | null;
  highlights: string | null;
  feature_blocks: string | null;
  faq: string | null;
  faq_html: string | null;
}

export interface BannerRow {
  id: number;
  title: string;
  subtitle: string | null;
  badge_text: string | null;
  price: number | null;
  cta_text: string | null;
  link_url: string;
  content_html: string | null;
}

export type Plan<T> =
  | { action: "skip"; reason: string }
  | {
      action: "convert";
      updates: T;
      unresolvedIcons: string[];
      // Colonnes story non vides dont le JSON n'a PAS validé le schéma Zod
      // (parseHighlights / parseFeatureBlocks / parseFaq ont retourné null).
      // Une colonne vide n'est pas "unparsed" — seule une colonne qui portait
      // du contenu et que le schéma actuel rejette compte. Ce contenu était
      // déjà invisible côté vitrine (le rendu passe par le même parseX), donc
      // le convertir en absence est fidèle à ce que le site affiche déjà ;
      // mais la conversion vide les colonnes source de façon irréversible,
      // alors que ce contenu restait récupérable (un admin aurait pu le
      // compléter pour le rendre valide). L'opérateur doit voir ces colonnes
      // avant de lancer la conversion — d'où ce champ, plutôt qu'un silence.
      unparsedColumns: string[];
    };

export interface ProductUpdates {
  description: string;
  description_type: "html";
  faq_html: string | null;
}

function blank(v: string | null): boolean {
  return v == null || v.trim() === "";
}

export function planProduct(row: ProductRow): Plan<ProductUpdates> {
  const hasStory =
    !blank(row.tagline) || !blank(row.highlights) || !blank(row.feature_blocks) || !blank(row.faq);

  // Idempotence : un produit déjà converti a ses colonnes story vides et une
  // description en HTML. C'est le seul marqueur — il n'y en a pas d'autre, et
  // c'est pour cela que la conversion VIDE les colonnes (§ 3.1 du spec).
  if (!hasStory && row.description_type === "html") {
    return { action: "skip", reason: "déjà converti" };
  }
  if (!hasStory && blank(row.description)) {
    return { action: "skip", reason: "aucun contenu" };
  }

  // Une description richtext est du JSON Lexical : elle doit passer par le
  // convertisseur avant de rejoindre un document HTML.
  //
  // Note d'implémentation (hors brief) : le test direct sur `row.description`
  // ci-dessous reprend exactement la logique de `blank()`, mais écrite en
  // ligne — `blank()` n'est pas un prédicat de type, donc TypeScript ne peut
  // pas rétrécir `row.description` de `string | null` à `string` à travers un
  // appel de fonction opaque (tsc --noEmit échoue sinon : TS2345). Aucun
  // changement de comportement, seulement de forme.
  const existingHtml =
    row.description == null || row.description.trim() === ""
      ? null
      : descriptionToHtml(row.description, row.description_type);

  const highlights = parseHighlights(row.highlights);
  const featureBlocks = parseFeatureBlocks(row.feature_blocks);
  const faq = parseFaq(row.faq);

  const { html, unresolvedIcons } = storyToHtml({
    tagline: row.tagline,
    highlights,
    feature_blocks: featureBlocks,
    description_html: existingHtml,
  });

  const faqHtml = faqToHtml(faq);

  // Une colonne non vide qui échoue la validation Zod est perdue par cette
  // conversion, silencieusement sinon : on le signale ici plutôt que de le
  // laisser disparaître sans trace (voir le commentaire sur `unparsedColumns`
  // au-dessus de `Plan`).
  const unparsedColumns: string[] = [];
  if (!blank(row.highlights) && highlights == null) unparsedColumns.push("highlights");
  if (!blank(row.feature_blocks) && featureBlocks == null) unparsedColumns.push("feature_blocks");
  if (!blank(row.faq) && faq == null) unparsedColumns.push("faq");

  return {
    action: "convert",
    unresolvedIcons,
    unparsedColumns,
    updates: {
      // Le scopeId est l'identifiant du produit : c'est celui qu'utilisait
      // l'écriture d'origine, donc les règles déjà préfixées le restent et
      // isAlreadyScoped() empêche un second préfixage.
      description: sanitizeDescriptionHtml(html, row.id),
      description_type: "html",
      faq_html: faqHtml ? sanitizeDescriptionHtml(faqHtml, row.id) : null,
    },
  };
}

export function planBanner(row: BannerRow): Plan<{ content_html: string }> {
  if (!blank(row.content_html)) {
    return { action: "skip", reason: "déjà converti" };
  }

  const html = bannerTemplateToHtml({
    title: row.title,
    subtitle: row.subtitle,
    badge_text: row.badge_text,
    price: row.price,
    cta_text: row.cta_text,
    link_url: row.link_url,
  });

  return {
    action: "convert",
    unresolvedIcons: [],
    // Aucune colonne story côté bannière : ce champ est structurel, jamais
    // renseigné ici.
    unparsedColumns: [],
    updates: { content_html: sanitizeDescriptionHtml(html, `banner-${row.id}`) },
  };
}
