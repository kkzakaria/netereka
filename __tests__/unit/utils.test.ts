import { describe, it, expect } from "vitest";
import { slugify, formatPrice, cn, formatOrderDate, formatDateShort, formatDateLong } from "@/lib/utils";

describe("slugify", () => {
  it("convertit un texte simple en slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("supprime les accents français", () => {
    expect(slugify("Écouteurs Bluetooth")).toBe("ecouteurs-bluetooth");
    expect(slugify("Téléphone à écran")).toBe("telephone-a-ecran");
    expect(slugify("Caméra réseau")).toBe("camera-reseau");
  });

  it("gère les caractères spéciaux", () => {
    expect(slugify("Prix: 50,000 FCFA!")).toBe("prix-50-000-fcfa");
    expect(slugify("TV 4K (65 pouces)")).toBe("tv-4k-65-pouces");
  });

  it("supprime les tirets en début/fin", () => {
    expect(slugify("--hello--")).toBe("hello");
    expect(slugify("  test  ")).toBe("test");
  });

  it("gère les espaces multiples", () => {
    expect(slugify("mot   un   deux")).toBe("mot-un-deux");
  });

  it("retourne une chaîne vide pour une entrée vide", () => {
    expect(slugify("")).toBe("");
  });

  it("gère les chiffres", () => {
    expect(slugify("iPhone 15 Pro Max")).toBe("iphone-15-pro-max");
  });

  it("gère le cédille et autres diacritiques", () => {
    expect(slugify("Façade")).toBe("facade");
    expect(slugify("naïve")).toBe("naive");
  });
});

describe("formatPrice", () => {
  it("formate un prix en XOF avec indicateur CFA", () => {
    const result = formatPrice(15000);
    expect(result).toContain("15");
    expect(result).toContain("000");
    // Re-exported from lib/utils/format — uses Intl currency format (F CFA)
    expect(result).toMatch(/CFA/);
  });

  it("formate zéro", () => {
    const result = formatPrice(0);
    expect(result).toContain("0");
    expect(result).toMatch(/CFA/);
  });

  it("formate un grand nombre avec séparateurs", () => {
    const result = formatPrice(1500000);
    expect(result).toMatch(/CFA/);
    expect(result).toMatch(/1.*500.*000/);
  });
});

describe("cn", () => {
  it("fusionne des classes simples", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("résout les conflits Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("gère les valeurs conditionnelles", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
    expect(cn("base", true && "visible")).toBe("base visible");
  });

  it("gère undefined et null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });
});

describe("formatOrderDate", () => {
  it("formate une date ISO en format court français", () => {
    const result = formatOrderDate("2024-01-25T14:30:00Z");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/janv/i);
  });
});

describe("formatDateShort", () => {
  it("formate en format court avec année", () => {
    const result = formatDateShort("2024-06-15T10:00:00Z");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
  });
});

describe("formatDateLong", () => {
  it("formate en format long avec mois complet", () => {
    const result = formatDateLong("2024-03-08T10:00:00Z");
    expect(result).toMatch(/08/);
    expect(result).toMatch(/mars/i);
    expect(result).toMatch(/2024/);
  });
});
