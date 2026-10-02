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
