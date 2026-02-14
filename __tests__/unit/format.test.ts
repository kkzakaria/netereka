import { describe, it, expect } from "vitest";
import { formatPrice, formatDate, formatDateTime } from "@/lib/utils/format";

describe("formatPrice (XOF currency)", () => {
  it("formate un prix en XOF", () => {
    const result = formatPrice(25000);
    // XOF format varie selon la locale mais doit contenir le montant
    expect(result).toMatch(/25/);
    expect(result).toMatch(/000/);
  });

  it("formate zéro", () => {
    const result = formatPrice(0);
    expect(result).toMatch(/0/);
  });

  it("n'affiche pas de décimales pour le XOF", () => {
    const result = formatPrice(1500);
    // Le XOF n'a pas de sous-unités
    expect(result).not.toMatch(/[.,]\d{2}$/);
  });

  it("formate les grands montants", () => {
    const result = formatPrice(2500000);
    expect(result).toMatch(/2.*500.*000/);
  });
});

describe("formatDate", () => {
  it("formate une date string", () => {
    const result = formatDate("2024-01-15");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
  });

  it("formate un objet Date", () => {
    const result = formatDate(new Date("2024-06-20T10:00:00Z"));
    expect(result).toMatch(/20/);
    expect(result).toMatch(/2024/);
  });
});

describe("formatDateTime", () => {
  it("inclut l'heure dans le format", () => {
    const result = formatDateTime("2024-01-15T14:30:00Z");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
    // Doit contenir une indication d'heure
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});
