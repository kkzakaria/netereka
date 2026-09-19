import { describe, it, expect } from "vitest";
import { planProduct, planBanner } from "@/lib/content/conversion-plan";
import { sanitizeDescriptionHtml } from "@/lib/utils/sanitize-html";

function product(over: Partial<Parameters<typeof planProduct>[0]> = {}) {
  return {
    id: "p1",
    description: null,
    description_type: "richtext",
    tagline: null,
    highlights: null,
    feature_blocks: null,
    faq: null,
    faq_html: null,
    ...over,
  };
}

function banner(over: Partial<Parameters<typeof planBanner>[0]> = {}) {
  return {
    id: 7,
    title: "OnePlus 15",
    subtitle: null,
    badge_text: null,
    price: null,
    cta_text: null,
    link_url: "/p/oneplus-15",
    content_html: null,
    ...over,
  };
}

describe("planProduct", () => {
  it("ignore un produit déjà converti", () => {
    const plan = planProduct(product({ description: "<p>x</p>", description_type: "html" }));
    expect(plan.action).toBe("skip");
  });

  it("ignore un produit entièrement vide", () => {
    expect(planProduct(product()).action).toBe("skip");
  });

  it("convertit une story complète", () => {
    const plan = planProduct(product({
      tagline: "Accroche",
      highlights: JSON.stringify([
        { icon: "battery", label: "7300 mAh" },
        { icon: "camera", label: "50 MP" },
        { icon: "bolt", label: "100 W" },
      ]),
      feature_blocks: JSON.stringify([
        { title: "Écran", body: "AMOLED" },
        { title: "Photo", body: "1 pouce" },
      ]),
      faq: JSON.stringify([{ question: "Garantie ?", answer: "12 mois." }]),
    }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.description_type).toBe("html");
    expect(plan.updates.description).toContain("Accroche");
    expect(plan.updates.description).toContain("AMOLED");
    expect(plan.updates.faq_html).toContain("<summary>Garantie ?</summary>");
    // La FAQ ne doit PAS finir dans la description : elle a son propre onglet.
    expect(plan.updates.description).not.toContain("Garantie ?");
  });

  it("convertit une story partielle", () => {
    const plan = planProduct(product({ tagline: "Seule" }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.faq_html).toBeNull();
  });

  it("convertit un produit qui n'a qu'une description richtext", () => {
    const plan = planProduct(product({ description: '{"root":{}}', description_type: "richtext" }));
    expect(plan.action).toBe("convert");
  });

  // Une colonne story non vide mais invalide au sens du schéma Zod actuel
  // (ex. 2 highlights, sous le minimum de 3) n'est PAS traitée comme absente
  // : le contenu était déjà invisible côté vitrine (le rendu passe par le
  // même parseHighlights), donc le convertir en absence est fidèle à ce que
  // le site affiche déjà — mais la conversion vide les colonnes source de
  // façon irréversible, alors que ce contenu restait récupérable par un
  // admin. `unparsedColumns` existe pour que l'opérateur voie ces lignes
  // avant de lancer la conversion, plutôt que de les perdre en silence.
  it("signale une colonne story non vide mais invalide, sans changer l'action", () => {
    const plan = planProduct(product({
      tagline: "Encore en vente",
      highlights: JSON.stringify([
        { icon: "battery", label: "A" },
        { icon: "camera", label: "B" },
      ]), // 2 éléments : sous le minimum de 3, rejeté en bloc par le schéma
    }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.description).toContain("Encore en vente");
    expect(plan.updates.description).not.toContain("battery");
    expect(plan.unparsedColumns).toEqual(["highlights"]);
  });

  it("signale plusieurs colonnes invalides à la fois", () => {
    const plan = planProduct(product({
      tagline: "Toujours là",
      highlights: JSON.stringify([
        { icon: "battery", label: "A" },
        { icon: "camera", label: "B" },
      ]), // 2 éléments : sous le minimum de 3
      feature_blocks: JSON.stringify([{ title: "Écran", body: "AMOLED" }]), // 1 bloc : sous le minimum de 2
    }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.unparsedColumns).toEqual(["highlights", "feature_blocks"]);
  });

  it("ne signale aucune colonne pour une story entièrement valide", () => {
    const plan = planProduct(product({
      tagline: "Accroche",
      highlights: JSON.stringify([
        { icon: "battery", label: "A" },
        { icon: "camera", label: "B" },
        { icon: "bolt", label: "C" },
      ]),
      feature_blocks: JSON.stringify([
        { title: "Écran", body: "AMOLED" },
        { title: "Photo", body: "1 pouce" },
      ]),
      faq: JSON.stringify([{ question: "Garantie ?", answer: "12 mois." }]),
    }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.unparsedColumns).toEqual([]);
  });

  // Le test "remonte les icônes non résolues sans échouer" du brief a été
  // retiré : son fixture (un seul highlight, icône hors énumération) ne peut
  // pas atteindre le code qu'il prétend exercer. `highlightsSchema` (3 à 6
  // éléments, icône dans l'énumération fermée HIGHLIGHT_ICON_NAMES) rejette
  // le tableau ENTIER via Zod avant que storyToHtml/iconToSvg ne voie quoi
  // que ce soit — parseHighlights retourne null, pas un tableau partiel avec
  // l'icône fautive isolée. Et même une icône appartenant à l'énumération ne
  // peut jamais échouer iconToSvg aujourd'hui : HIGHLIGHT_ICON_MAP est typé
  // `Record<HighlightIconName, IconSvgElement>`, donc TypeScript impose une
  // entrée pour chacun des 52 noms. `unresolvedIcons` reste dans le module —
  // il est correct pour un appelant direct de storyToHtml, déjà couvert par
  // story-to-html.test.ts (tâche 6) — mais n'est structurellement pas
  // atteignable via planProduct. Un test qu'on ne peut pas faire échouer est
  // une fausse couverture ; on ne le garde pas pour le principe.

  it("préfixe le CSS de l'auteur avec l'identifiant du produit", () => {
    const plan = planProduct(product({
      description: "<style>.t{color:red}</style><p class='t'>x</p>",
      description_type: "html",
      tagline: "Accroche",
    }));
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.description).toContain(".desc-p1 .t");
  });

  it("est rejouable : convertir la sortie ne la change plus", () => {
    const first = planProduct(product({ tagline: "Accroche" }));
    if (first.action !== "convert") throw new Error("unreachable");
    const second = planProduct(product({
      description: first.updates.description,
      description_type: "html",
    }));
    expect(second.action).toBe("skip");
  });

  // Le brief n'utilise que `{"root":{}}` (un état Lexical dégénéré, sans
  // `type`, qui ne produit légitimement aucun HTML) pour vérifier que l'action
  // est "convert". Cela ne prouve pas que le contenu d'une vraie description
  // richtext traverse la conversion : ici on rejoue avec un état Lexical
  // réaliste (un paragraphe non vide) et on vérifie que le texte survit.
  it("conserve le texte d'une description richtext réaliste", () => {
    const lexical = JSON.stringify({
      root: {
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", text: "Un smartphone taillé pour la 4G ivoirienne." }],
          },
        ],
      },
    });
    const plan = planProduct(product({ description: lexical, description_type: "richtext" }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.description).toContain("Un smartphone taillé pour la 4G ivoirienne.");
  });

  // Trois régressions distinctes sur cette branche ont laissé le sanitizer
  // altérer silencieusement un HTML généré, avec des tests tous verts parce
  // qu'ils n'affirmaient que sur la sortie brute du convertisseur, jamais sur
  // ce qui atteint réellement la base. La sanitisation est censée être
  // idempotente : on le prouve ici, sur ce que `planProduct` décide d'écrire,
  // plutôt que de le supposer.
  it("le HTML écrit dans description est stable sous un second passage de sanitizeDescriptionHtml", () => {
    const plan = planProduct(product({
      tagline: "Accroche",
      highlights: JSON.stringify([{ icon: "battery", label: "7300 mAh" }]),
      feature_blocks: JSON.stringify([{ title: "Écran", body: "AMOLED" }]),
      description: "<style>.t{color:red}</style><p class='t'>x</p>",
      description_type: "html",
    }));
    if (plan.action !== "convert") throw new Error("unreachable");
    const replayed = sanitizeDescriptionHtml(plan.updates.description, "p1");
    expect(replayed).toBe(plan.updates.description);
  });

  it("le HTML écrit dans faq_html est stable sous un second passage de sanitizeDescriptionHtml", () => {
    const plan = planProduct(product({
      faq: JSON.stringify([{ question: "Garantie ?", answer: "12 mois." }]),
    }));
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.faq_html).not.toBeNull();
    const replayed = sanitizeDescriptionHtml(plan.updates.faq_html as string, "p1");
    expect(replayed).toBe(plan.updates.faq_html);
  });
});

describe("planBanner", () => {
  it("ignore une bannière déjà convertie", () => {
    expect(planBanner(banner({ content_html: "<div>x</div>" })).action).toBe("skip");
  });

  it("convertit le gabarit", () => {
    const plan = planBanner(banner({ badge_text: "Promo", price: 199000 }));
    expect(plan.action).toBe("convert");
    if (plan.action !== "convert") throw new Error("unreachable");
    expect(plan.updates.content_html).toContain("OnePlus 15");
    expect(plan.updates.content_html).toContain("Promo");
  });

  it("traite un content_html vide comme absent", () => {
    expect(planBanner(banner({ content_html: "   " })).action).toBe("convert");
  });

  // Même exigence d'idempotence que pour planProduct, appliquée à content_html
  // avec le scopeId `banner-<id>` — c'est précisément l'identifiant qu'un
  // mauvais scopeId casserait silencieusement.
  it("le HTML écrit dans content_html est stable sous un second passage de sanitizeDescriptionHtml", () => {
    const plan = planBanner(banner({ badge_text: "Promo", price: 199000 }));
    if (plan.action !== "convert") throw new Error("unreachable");
    const replayed = sanitizeDescriptionHtml(plan.updates.content_html, "banner-7");
    expect(replayed).toBe(plan.updates.content_html);
  });
});
