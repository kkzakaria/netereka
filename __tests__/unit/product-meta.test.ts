import { describe, it, expect } from "vitest";
import { buildProductMetaDescription } from "@/lib/seo/product-meta";

describe("buildProductMetaDescription", () => {
  it("sans short_description : nom + prix + signaux locaux", () => {
    const d = buildProductMetaDescription("iPhone 17 256 Go", "530 000 F CFA", null);
    expect(d).toBe(
      "Achetez iPhone 17 256 Go au prix de 530 000 F CFA en Côte d'Ivoire. Livraison rapide à Abidjan, paiement à la livraison."
    );
  });

  it("avec short_description : la conserve ET ajoute prix + signaux locaux", () => {
    const d = buildProductMetaDescription(
      "Xiaomi 17 Ultra",
      "750 000 F CFA",
      "Xiaomi 17 Ultra 5G 16Go 512Go Blanc – Smartphone Premium Double SIM"
    );
    expect(d).toContain("Smartphone Premium Double SIM");
    expect(d).toContain("750 000 F CFA");
    expect(d).toContain("Abidjan");
    expect(d).toContain("paiement à la livraison");
  });

  it("ne double pas la ponctuation finale de la short_description", () => {
    const d = buildProductMetaDescription("Test", "1 000 F CFA", "Super produit.");
    expect(d).not.toContain("..");
  });

  it("short_description vide ou espaces = fallback nom", () => {
    const d = buildProductMetaDescription("Test", "1 000 F CFA", "   ");
    expect(d).toContain("Achetez Test au prix de 1 000 F CFA");
  });
});
