import { describe, it, expect } from "vitest";
import { premiereImageDuContenu } from "@/lib/cloudflare/hero-preload-image";

/**
 * Le préchargement doit désigner l'image que le navigateur demandera vraiment.
 * Depuis que la diapositive accueille une composition libre, cette image vit
 * dans le `content_html` — et l'ancien préchargement, qui la déduisait de la
 * colonne `image_url` en lui appliquant `/cdn-cgi/image/width=640…`, pointait
 * une adresse que personne ne demandait.
 */
describe("premiereImageDuContenu", () => {
  it("rend le src de la première image, telle qu'écrite", () => {
    const html = '<div class="nk-banner"><h2>Titre</h2><img class="nk-media" src="https://r2.example/banners/7-a.webp" alt="x"></div>';
    expect(premiereImageDuContenu(html)).toBe("https://r2.example/banners/7-a.webp");
  });

  // Pas de transformation : l'auteur a pu choisir une URL déjà passée par le
  // redimensionneur, une autre largeur, ou une image qui n'est pas celle de la
  // colonne. On précharge ce qu'il a écrit, sinon les deux divergent à nouveau.
  it("ne transforme rien, même une URL déjà passée par /cdn-cgi/image", () => {
    const html = '<img src="/cdn-cgi/image/width=1280,quality=75,format=auto/banners/7-a.webp">';
    expect(premiereImageDuContenu(html)).toBe("/cdn-cgi/image/width=1280,quality=75,format=auto/banners/7-a.webp");
  });

  it("la PREMIÈRE, pas une autre", () => {
    const html = '<img src="/a.webp"><p>t</p><img src="/b.webp">';
    expect(premiereImageDuContenu(html)).toBe("/a.webp");
  });

  it("l'ordre des attributs n'a pas d'importance", () => {
    expect(premiereImageDuContenu('<img alt="x" width="600" src="/a.webp" loading="lazy">')).toBe("/a.webp");
  });

  it("les apostrophes simples valent les doubles", () => {
    expect(premiereImageDuContenu("<img src='/a.webp'>")).toBe("/a.webp");
  });

  // Elle est déjà dans le document téléchargé avec le HTML : la précharger
  // dupliquerait des octets déjà reçus.
  it("ignore une data URI et prend la suivante", () => {
    const html = '<img src="data:image/gif;base64,R0lGOD"><img src="/vraie.webp">';
    expect(premiereImageDuContenu(html)).toBe("/vraie.webp");
  });

  it("ignore une balise sans src, et une sans rien", () => {
    expect(premiereImageDuContenu('<img alt="décoratif"><img src="/a.webp">')).toBe("/a.webp");
    expect(premiereImageDuContenu('<img src="">')).toBeNull();
    expect(premiereImageDuContenu('<img src="   ">')).toBeNull();
  });

  it("rend null sans image, et sur un contenu vide ou absent", () => {
    expect(premiereImageDuContenu("<p>Pas d'image ici</p>")).toBeNull();
    expect(premiereImageDuContenu("")).toBeNull();
    expect(premiereImageDuContenu(null)).toBeNull();
    expect(premiereImageDuContenu(undefined)).toBeNull();
  });

  // `<image>` est un élément SVG, pas une balise image HTML : le préchargement
  // d'une page ne doit pas s'y accrocher. Garde contre une regex trop lâche
  // (`<img` sans frontière de mot attraperait aussi `<imgx`).
  it("ne confond pas <img> avec une balise qui commence pareil", () => {
    expect(premiereImageDuContenu('<imgx src="/faux.webp">')).toBeNull();
    expect(premiereImageDuContenu('<image src="/svg.webp">')).toBeNull();
  });

  it("majuscules acceptées : le HTML n'est pas sensible à la casse", () => {
    expect(premiereImageDuContenu('<IMG SRC="/a.webp">')).toBe("/a.webp");
  });
});

/**
 * Les entités d'un attribut HTML ne font pas partie de l'URL : le navigateur
 * demande `&`, pas `&amp;`. Précharger le littéral, c'est précharger une
 * adresse que la page ne demandera jamais — exactement la divergence que ce
 * module existe pour fermer, réintroduite par un détail d'encodage.
 */
describe("entités HTML dans le src", () => {
  it("rend l'URL que le navigateur demandera, pas le littéral de l'attribut", () => {
    expect(premiereImageDuContenu('<img src="https://x.test/a.png?w=1&amp;h=2">'))
      .toBe("https://x.test/a.png?w=1&h=2");
  });

  it("laisse intacte une URL sans entité", () => {
    expect(premiereImageDuContenu('<img src="/cdn-cgi/image/width=1280,quality=80,format=auto/https://r2.netereka.ci/banners/7.png">'))
      .toBe("/cdn-cgi/image/width=1280,quality=80,format=auto/https://r2.netereka.ci/banners/7.png");
  });
});

/**
 * Le décodage se fait en UN passage, et ce test dit pourquoi.
 *
 * Décoder `&amp;` avant les autres décode deux fois : `&amp;lt;` — la façon
 * correcte d'écrire le texte « &lt; » — deviendrait `&lt;` puis `<`. On
 * fabriquerait un chevron que l'auteur n'a pas écrit, dans une valeur qui
 * part ensuite dans un en-tête `Link`. CodeQL appelle cela
 * `js/double-escaping` et l'a signalé sur la première version.
 */
describe("décodage en un seul passage", () => {
  it("ne décode pas deux fois une entité échappée", () => {
    expect(premiereImageDuContenu('<img src="https://x.test/a.png?t=&amp;lt;b&amp;gt;">'))
      .toBe("https://x.test/a.png?t=&lt;b&gt;");
  });

  it("décode chaque entité une fois", () => {
    expect(premiereImageDuContenu('<img src="https://x.test/a?a=1&amp;b=2&#39;c">'))
      .toBe("https://x.test/a?a=1&b=2'c");
  });

  it("laisse intacte une entité inconnue", () => {
    expect(premiereImageDuContenu('<img src="https://x.test/a?x=&nbsp;">'))
      .toBe("https://x.test/a?x=&nbsp;");
  });
});
