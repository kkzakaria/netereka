import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * La diapositive du hero est une TOILE LIBRE quand la bannière porte un
 * `content_html` : la composition occupe la diapositive entière, et
 * `image_url` n'est plus un emplacement rendu à côté d'elle.
 *
 * Ces tests MONTENT le composant (react-dom/server, l'environnement vitest
 * étant `node`) au lieu de lire son source : c'est le seul moyen de prouver
 * qu'aucune image n'est rendue une SECONDE fois, un grep ne pouvant distinguer
 * la branche du repli de celle de la toile libre. Embla et les composants
 * next/* sont remplacés par le minimum rendu côté serveur.
 *
 * `useEffect` ne s'exécute pas au rendu serveur : ce qui est observé ici est
 * exactement le HTML initial envoyé au navigateur, et rien du comportement du
 * carrousel.
 */
vi.mock("embla-carousel-react", () => ({
  default: () => [() => {}, undefined] as const,
}));
vi.mock("embla-carousel-autoplay", () => ({ default: () => ({}) }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    createElement("img", { "data-next-image": "", src, alt }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children?: unknown }) =>
    createElement("a", { href }, children as never),
}));

// Espionné, non remplacé : le vrai comportement est celui qu'on veut, mais
// le rendu doit prouver qu'il passe PAR LUI (voir le test de couplage).
vi.mock("@/lib/cloudflare/hero-preload-image", async (importOriginal) => {
  const vrai = await importOriginal<typeof import("@/lib/cloudflare/hero-preload-image")>();
  return { premiereImageDuContenu: vi.fn(vrai.premiereImageDuContenu) };
});

import { HeroBanner } from "@/components/storefront/hero-banner";
import type { Banner, ProductCardData } from "@/lib/db/types";

function banner(over: Partial<Banner> = {}): Banner {
  return {
    id: 7, title: "OnePlus 15", subtitle: null, badge_text: null, badge_color: "mint",
    image_url: "banners/7-a.jpg", link_url: "/p/oneplus-15", cta_text: "Découvrir",
    price: null, bg_gradient_from: "#183C78", bg_gradient_to: "#1E4A8F",
    display_order: 0, is_active: 1, starts_at: null, ends_at: null,
    content_html: null, created_at: "", updated_at: "", ...over,
  };
}

const PRODUCT = {
  id: "p1", slug: "x", name: "Produit X", base_price: 1000, compare_price: null,
  brand: "Marque", is_featured: 1, image_url: "products/p1/a.jpg",
} as unknown as ProductCardData;

function render(banners: Banner[], fallbackProducts: ProductCardData[] = []): string {
  return renderToStaticMarkup(createElement(HeroBanner, { banners, fallbackProducts }));
}

/** Les `<img>` rendus par le composant lui-même, via next/image. */
function nextImages(html: string): string[] {
  return html.match(/<img data-next-image[^>]*>/g) ?? [];
}

const COMPOSITION =
  "<div class=\"nk-banner\"><h2 class=\"nk-banner-title\">Promo</h2>" +
  "<img class=\"nk-media\" src=\"https://r2.example/banners/7-a.jpg\" alt=\"OnePlus 15\"></div>";

describe("toile libre : content_html occupe la diapositive entière", () => {
  it("rend la composition telle quelle", () => {
    expect(render([banner({ content_html: COMPOSITION })])).toContain(COMPOSITION);
  });

  // LE test de ce fichier. Une bannière qui a À LA FOIS un content_html et une
  // image_url ne doit montrer qu'UNE image : celle que l'auteur a placée.
  // Rendre aussi la colonne d'image en afficherait deux — le défaut même que
  // cette libération corrige.
  it("n'affiche PAS image_url à côté : l'auteur place l'image lui-même", () => {
    const html = render([banner({ content_html: COMPOSITION, image_url: "banners/7-a.jpg" })]);
    expect(nextImages(html)).toEqual([]);
    // L'unique image du rendu est bien celle de la composition.
    expect(html.match(/<img/g)).toHaveLength(1);
  });

  // « Pas de grille imposée » : la toile n'est pas une moitié de diapositive.
  it("n'enferme la composition dans aucune colonne", () => {
    const html = render([banner({ content_html: COMPOSITION })]);
    expect(html).not.toContain("grid-cols-2");
  });

  it("donne à la toile toute la surface de la diapositive", () => {
    const html = render([banner({ content_html: COMPOSITION })]);
    // La classe de portée identifie sans ambiguïté le conteneur de la toile.
    const container = html.match(/<div class="([^"]*desc-banner-7[^"]*)"/)?.[1];
    expect(container, "conteneur de la toile introuvable").toBeTruthy();
    expect(container).toContain("h-full");
    expect(container).toContain("w-full");
  });

  // Le mécanisme de portée CSS persisté : `sanitizeDescriptionHtml` a préfixé
  // les sélecteurs du <style> stocké par `.desc-banner-<id>`. Déplacer le
  // conteneur sans emporter cette classe enlèverait tout effet au CSS de
  // l'auteur, en silence.
  it("garde la classe de portée sur le conteneur de la toile", () => {
    expect(render([banner({ id: 42, content_html: COMPOSITION })])).toContain("desc-banner-42");
  });

  // Propriétés de la SURFACE, pas du gabarit : elles survivent à la
  // libération, et les descriptions d'outils les annoncent encore.
  it("conserve le dégradé de fond et les hauteurs annoncées", () => {
    const html = render([banner({ content_html: COMPOSITION })]);
    expect(html).toContain("linear-gradient(135deg, #183C78, #1E4A8F)");
    expect(html).toContain("h-[280px]");
    expect(html).toContain("sm:h-[400px]");
    expect(html).toContain("lg:h-[480px]");
  });
});

/**
 * La transition, et pourquoi elle existe. Vérifié en production le
 * 2026-10-04 : les quatre bannières actives portent toutes un `content_html`
 * et une `image_url`, et AUCUNE ne porte d'`<img>` dans son HTML. Livrer la
 * toile libre sans cette règle retirait donc d'un coup la photo des quatre
 * diapositives — l'élément LCP de la page d'accueil — pour une amélioration
 * dont l'effet serait venu plus tard, à la recomposition.
 *
 * Elle s'efface d'elle-même : dès qu'une composition porte son image, la
 * toile libre reprend.
 */
describe("transition : une composition sans image garde le visuel de la bannière", () => {
  const SANS_IMAGE = "<div class=\"nk-banner\"><h2 class=\"nk-banner-title\">Promo</h2><p>Texte seul</p></div>";

  it("rend encore image_url à côté d'une composition qui n'en place aucune", () => {
    const html = render([banner({ content_html: SANS_IMAGE, image_url: "banners/7-a.jpg" })]);
    expect(nextImages(html)).toHaveLength(1);
    expect(html).toContain("grid-cols-2");
  });

  /**
   * LE test que la première version de cette transition n'avait pas, et le
   * défaut qu'il a révélé : la grille rendait le GABARIT React
   * (badge/titre/sous-titre/prix/bouton), pas la composition. La transition
   * gardait donc le visuel et PERDAIT le texte éditorial des quatre
   * bannières en ligne — pire que ce qu'elle évitait. Elle doit reproduire
   * l'ancien rendu, pas un autre.
   */
  it("rend la COMPOSITION dans la colonne gauche, pas le gabarit React", () => {
    const html = render([
      banner({ content_html: SANS_IMAGE, image_url: "banners/7-a.jpg", badge_text: "Nouveau", subtitle: "Gabarit" }),
    ]);
    expect(html).toContain("Texte seul");
    expect(html).toContain("nk-banner-title");
    // Le gabarit React ne doit PAS s'y substituer.
    expect(html).not.toContain("Nouveau");
    expect(html).not.toContain("Gabarit");
  });

  // La portée CSS suit la composition partout où elle est rendue : sans elle,
  // le <style> de l'auteur n'a aucun effet dans la transition.
  it("garde la classe de portée dans la transition aussi", () => {
    const html = render([banner({ id: 42, content_html: SANS_IMAGE, image_url: "banners/42-a.jpg" })]);
    expect(html).toContain("desc-banner-42");
  });

  // La bascule est automatique : rien à désactiver, rien à migrer.
  it("cesse dès que la composition place son image", () => {
    const html = render([banner({ content_html: COMPOSITION, image_url: "banners/7-a.jpg" })]);
    expect(nextImages(html)).toEqual([]);
    expect(html).not.toContain("grid-cols-2");
  });

  // Sans image à perdre, il n'y a rien à ménager : la toile libre tout de suite.
  it("une bannière sans image_url passe en toile libre même sans <img>", () => {
    const html = render([banner({ content_html: SANS_IMAGE, image_url: null })]);
    expect(html).not.toContain("grid-cols-2");
    expect(html).toContain("Texte seul");
  });

  /**
   * Le rendu et le préchargement doivent lire « cette composition porte son
   * image » de la MÊME façon : s'ils divergent, on précharge une adresse que
   * la page ne demandera pas — le défaut même que cette branche corrige.
   *
   * La première version de ce test appelait `premiereImageDuContenu` deux
   * fois et vérifiait ses retours : elle prouvait que la FONCTION marche,
   * pas que le rendu l'emploie. Remplacer l'appel dans `hero-banner.tsx` par
   * une autre lecture l'aurait laissée verte. Ici le module est espionné :
   * le rendu doit l'appeler, avec le HTML de la bannière.
   */
  it("décide par la lecture du préchargement, et pas par la sienne", async () => {
    const { premiereImageDuContenu } = await import("@/lib/cloudflare/hero-preload-image");
    const espion = vi.mocked(premiereImageDuContenu);
    espion.mockClear();

    render([banner({ content_html: SANS_IMAGE, image_url: "banners/7-a.jpg" })]);

    expect(espion).toHaveBeenCalledWith(SANS_IMAGE);
  });
});

describe("repli intact : aucun content_html", () => {
  // Le repli sert les produits en vedette (id: null), qui n'ont rien à voir
  // avec les bannières. Sa grille à deux colonnes et sa colonne d'image
  // doivent survivre telles quelles.
  it("garde la grille à deux colonnes pour les produits en vedette", () => {
    const html = render([], [PRODUCT]);
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("Produit X");
  });

  it("rend bien l'image du repli, elle", () => {
    expect(nextImages(render([], [PRODUCT]))).toHaveLength(1);
  });

  it("garde aussi la grille pour une bannière d'avant l'éditeur", () => {
    const html = render([banner({ badge_text: "Nouveau" })]);
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("Nouveau");
    expect(nextImages(html)).toHaveLength(1);
  });
});
