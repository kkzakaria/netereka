import { describe, it, expect } from "vitest";
import { cleDuPrechargementRepli } from "@/lib/cloudflare/hero-preload-key";

/**
 * Le middleware décide, à partir de la seule valeur stockée en KV, s'il faut
 * ou non un SECOND préchargement (`imagesrcset`, variantes par DPR) émis par
 * le layout.
 *
 * Aucun test ne couvrait cette extraction, et c'est ce qui a laissé passer
 * une régression : depuis que l'URL tendue aux auteurs est transformée
 * (`/cdn-cgi/image/…format=auto/…`), elle correspondait au motif lâche du
 * middleware. Le navigateur recevait alors l'en-tête `Link` sur l'URL que la
 * page demande VRAIMENT, plus un `imagesrcset` sur des variantes qu'elle ne
 * demandera jamais — une image téléchargée pour rien, c'est-à-dire le défaut
 * même que cette branche corrige.
 */
const lien = (url: string) => `<${url}>; rel=preload; as=image; fetchpriority=high`;
const R2 = "https://r2.netereka.ci";

describe("cleDuPrechargementRepli", () => {
  it("rend la clé pour la forme EXACTE du repli", () => {
    const url = `/cdn-cgi/image/width=640,quality=75,format=auto/${R2}/banners/7-abc.png`;
    expect(cleDuPrechargementRepli(lien(url))).toBe("banners/7-abc.png");
  });

  // LE cas de la régression.
  it("rend null pour l'URL transformée que nous tendons aux auteurs", () => {
    const url = `/cdn-cgi/image/width=1280,quality=75,format=auto/${R2}/banners/7-abc.png`;
    expect(cleDuPrechargementRepli(lien(url))).toBeNull();
  });

  it("rend null pour une URL de composition quelconque", () => {
    expect(cleDuPrechargementRepli(lien("https://images.example.test/visuel.webp"))).toBeNull();
  });

  it("rend null pour une adresse R2 brute", () => {
    expect(cleDuPrechargementRepli(lien(`${R2}/banners/7-abc.png`))).toBeNull();
  });

  it("rend null sur une valeur absente ou illisible", () => {
    expect(cleDuPrechargementRepli(null)).toBeNull();
    expect(cleDuPrechargementRepli("")).toBeNull();
    expect(cleDuPrechargementRepli("rel=preload; as=image")).toBeNull();
  });

  // La clé peut contenir des barres : `products/<id>/<nom>`.
  it("garde la clé entière, segments compris", () => {
    const url = `/cdn-cgi/image/width=640,quality=75,format=auto/${R2}/products/p1/a-b_c.webp`;
    expect(cleDuPrechargementRepli(lien(url))).toBe("products/p1/a-b_c.webp");
  });
});
