import { describe, it, expect, vi, beforeEach } from "vitest";
import { getImageUrl, getPublicImageUrl } from "@/lib/utils/images";

describe("getImageUrl", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("retourne le placeholder pour null", () => {
    expect(getImageUrl(null)).toBe("/images/placeholder.webp");
  });

  it("retourne le placeholder pour undefined", () => {
    expect(getImageUrl(undefined)).toBe("/images/placeholder.webp");
  });

  it("retourne le placeholder pour une chaîne vide", () => {
    expect(getImageUrl("")).toBe("/images/placeholder.webp");
  });

  it("retourne l'URL absolue telle quelle (http)", () => {
    const url = "http://example.com/image.jpg";
    expect(getImageUrl(url)).toBe(url);
  });

  it("retourne l'URL absolue telle quelle (https)", () => {
    const url = "https://cdn.example.com/image.png";
    expect(getImageUrl(url)).toBe(url);
  });

  it("retourne les chemins root-relatifs tels quels", () => {
    expect(getImageUrl("/images/product.jpg")).toBe("/images/product.jpg");
  });

  it("préfixe avec R2_URL si défini", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_URL", "https://r2.netereka.ci");
    expect(getImageUrl("products/phone.jpg")).toBe(
      "https://r2.netereka.ci/products/phone.jpg"
    );
  });

  it("utilise /images comme fallback sans R2_URL", () => {
    delete process.env.NEXT_PUBLIC_R2_URL;
    expect(getImageUrl("products/phone.jpg")).toBe("/images/products/phone.jpg");
  });
});

/**
 * Variante destinée aux appelants qui TRANSMETTENT l'URL à un tiers plutôt
 * que de la poser eux-mêmes dans un `src` — `get_banner` (lib/mcp/tools/
 * banners.ts) la renvoie à l'assistant qui compose la bannière. Pour eux, le
 * repli `/images/<clé>` de `getImageUrl` est pire qu'une absence : il
 * ressemble à une URL valide et ne mène à rien.
 */
describe("getPublicImageUrl", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("résout une clé de stockage avec R2_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_R2_URL", "https://r2.netereka.ci");
    expect(getPublicImageUrl("banners/7-a.jpg")).toBe("https://r2.netereka.ci/banners/7-a.jpg");
  });

  // LE test de cette fonction : sans adresse publique au build, aucune URL
  // n'est devinable, et c'est ce qu'elle doit dire.
  it("rend null plutôt qu'un chemin relatif cassé sans R2_URL", () => {
    delete process.env.NEXT_PUBLIC_R2_URL;
    expect(getPublicImageUrl("banners/7-a.jpg")).toBeNull();
    // Là où getImageUrl, lui, fabrique un repli qui n'existe pas sur le site.
    expect(getImageUrl("banners/7-a.jpg")).toBe("/images/banners/7-a.jpg");
  });

  it("rend null sans chemin", () => {
    expect(getPublicImageUrl(null)).toBeNull();
    expect(getPublicImageUrl(undefined)).toBeNull();
    expect(getPublicImageUrl("")).toBeNull();
  });

  it("laisse passer une URL absolue et un chemin root-relatif", () => {
    delete process.env.NEXT_PUBLIC_R2_URL;
    expect(getPublicImageUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    expect(getPublicImageUrl("/images/a.jpg")).toBe("/images/a.jpg");
  });
});
