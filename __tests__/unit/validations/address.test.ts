import { describe, it, expect } from "vitest";
import { addressSchema } from "@/lib/validations/address";

const validAddress = {
  label: "Maison",
  fullName: "Koné Amadou",
  phone: "0102030405",
  street: "Rue des Jardins, Cocody",
  commune: "Cocody",
  city: "Abidjan",
};

describe("addressSchema", () => {
  it("accepte une adresse valide", () => {
    const result = addressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  it("utilise Abidjan comme ville par défaut", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { city, ...withoutCity } = validAddress;
    const result = addressSchema.safeParse(withoutCity);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBe("Abidjan");
    }
  });

  // --- Téléphone ivoirien ---

  it("accepte un numéro à 10 chiffres", () => {
    const result = addressSchema.safeParse({ ...validAddress, phone: "0708091011" });
    expect(result.success).toBe(true);
  });

  it("accepte un numéro avec préfixe +225", () => {
    const result = addressSchema.safeParse({ ...validAddress, phone: "+2250102030405" });
    expect(result.success).toBe(true);
  });

  it("nettoie les espaces et tirets du numéro", () => {
    const result = addressSchema.safeParse({ ...validAddress, phone: "01 02 03-04-05" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("0102030405");
    }
  });

  it("rejette un numéro trop court", () => {
    const result = addressSchema.safeParse({ ...validAddress, phone: "01020304" });
    expect(result.success).toBe(false);
  });

  it("rejette un numéro trop long", () => {
    const result = addressSchema.safeParse({ ...validAddress, phone: "010203040506" });
    expect(result.success).toBe(false);
  });

  it("rejette un numéro avec des lettres", () => {
    const result = addressSchema.safeParse({ ...validAddress, phone: "01020304ab" });
    expect(result.success).toBe(false);
  });

  // --- Champs requis ---

  it("rejette un label vide", () => {
    const result = addressSchema.safeParse({ ...validAddress, label: "" });
    expect(result.success).toBe(false);
  });

  it("rejette un nom trop court", () => {
    const result = addressSchema.safeParse({ ...validAddress, fullName: "A" });
    expect(result.success).toBe(false);
  });

  it("rejette une adresse rue trop courte", () => {
    const result = addressSchema.safeParse({ ...validAddress, street: "AB" });
    expect(result.success).toBe(false);
  });

  it("rejette une commune vide", () => {
    const result = addressSchema.safeParse({ ...validAddress, commune: "" });
    expect(result.success).toBe(false);
  });

  // --- Limites de longueur ---

  it("rejette un label trop long (>50)", () => {
    const result = addressSchema.safeParse({ ...validAddress, label: "a".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("rejette un nom trop long (>100)", () => {
    const result = addressSchema.safeParse({ ...validAddress, fullName: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  // --- Champ optionnel ---

  it("accepte les instructions optionnelles", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      instructions: "Sonner 2 fois",
    });
    expect(result.success).toBe(true);
  });

  it("rejette des instructions trop longues (>500)", () => {
    const result = addressSchema.safeParse({
      ...validAddress,
      instructions: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
