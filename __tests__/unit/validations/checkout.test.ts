import { describe, it, expect } from "vitest";
import { checkoutSchema } from "@/lib/validations/checkout";

const validItem = { productId: "prod-1", variantId: null, quantity: 2 };

const validCheckoutWithSavedAddress = {
  savedAddressId: "addr-1",
  commune: "Cocody",
  items: [validItem],
};

const validCheckoutWithNewAddress = {
  fullName: "Koné Amadou",
  phone: "0102030405",
  street: "Rue des Jardins, Cocody",
  commune: "Cocody",
  items: [validItem],
};

describe("checkoutSchema", () => {
  // --- Cas valides ---

  it("accepte un checkout avec adresse enregistrée", () => {
    const result = checkoutSchema.safeParse(validCheckoutWithSavedAddress);
    expect(result.success).toBe(true);
  });

  it("accepte un checkout avec nouvelle adresse complète", () => {
    const result = checkoutSchema.safeParse(validCheckoutWithNewAddress);
    expect(result.success).toBe(true);
  });

  it("saveAddress est false par défaut", () => {
    const result = checkoutSchema.safeParse(validCheckoutWithNewAddress);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.saveAddress).toBe(false);
    }
  });

  // --- Validation du panier ---

  it("rejette un panier vide", () => {
    const result = checkoutSchema.safeParse({
      ...validCheckoutWithSavedAddress,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejette une quantité à 0", () => {
    const result = checkoutSchema.safeParse({
      ...validCheckoutWithSavedAddress,
      items: [{ ...validItem, quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejette une quantité > 10", () => {
    const result = checkoutSchema.safeParse({
      ...validCheckoutWithSavedAddress,
      items: [{ ...validItem, quantity: 11 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepte quantité de 1 à 10", () => {
    for (const q of [1, 5, 10]) {
      const result = checkoutSchema.safeParse({
        ...validCheckoutWithSavedAddress,
        items: [{ ...validItem, quantity: q }],
      });
      expect(result.success).toBe(true);
    }
  });

  // --- Validation conditionnelle d'adresse ---

  it("rejette sans adresse enregistrée ET sans adresse complète", () => {
    const result = checkoutSchema.safeParse({
      commune: "Cocody",
      items: [validItem],
    });
    expect(result.success).toBe(false);
  });

  it("rejette si nouvelle adresse incomplète (manque fullName)", () => {
    const result = checkoutSchema.safeParse({
      phone: "0102030405",
      street: "Rue test",
      commune: "Cocody",
      items: [validItem],
    });
    expect(result.success).toBe(false);
  });

  it("rejette si nouvelle adresse incomplète (manque phone)", () => {
    const result = checkoutSchema.safeParse({
      fullName: "Koné Amadou",
      street: "Rue test",
      commune: "Cocody",
      items: [validItem],
    });
    expect(result.success).toBe(false);
  });

  it("rejette si nouvelle adresse incomplète (manque street)", () => {
    const result = checkoutSchema.safeParse({
      fullName: "Koné Amadou",
      phone: "0102030405",
      commune: "Cocody",
      items: [validItem],
    });
    expect(result.success).toBe(false);
  });

  // --- Commune toujours requise ---

  it("rejette sans commune", () => {
    const result = checkoutSchema.safeParse({
      savedAddressId: "addr-1",
      items: [validItem],
    });
    expect(result.success).toBe(false);
  });

  // --- Champs optionnels ---

  it("accepte un code promo", () => {
    const result = checkoutSchema.safeParse({
      ...validCheckoutWithSavedAddress,
      promoCode: "NOEL2024",
    });
    expect(result.success).toBe(true);
  });

  it("accepte des instructions de livraison", () => {
    const result = checkoutSchema.safeParse({
      ...validCheckoutWithSavedAddress,
      instructions: "Appeler en arrivant",
    });
    expect(result.success).toBe(true);
  });

  // --- Téléphone avec nettoyage ---

  it("nettoie les espaces et tirets du téléphone", () => {
    const result = checkoutSchema.safeParse({
      ...validCheckoutWithNewAddress,
      phone: "01 02-03 04-05",
    });
    expect(result.success).toBe(true);
  });
});
