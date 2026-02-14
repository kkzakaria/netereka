import { describe, it, expect, vi, beforeEach } from "vitest";
import { getImageUrl } from "@/lib/utils/images";

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
