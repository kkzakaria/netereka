import { describe, it, expect } from "vitest";
import { profileSchema, changePasswordSchema } from "@/lib/validations/account";

describe("profileSchema", () => {
  it("accepte un profil valide", () => {
    const result = profileSchema.safeParse({
      name: "Koné Amadou",
      phone: "0102030405",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un nom trop court", () => {
    const result = profileSchema.safeParse({ name: "A", phone: "0102030405" });
    expect(result.success).toBe(false);
  });

  it("rejette un nom trop long (>100)", () => {
    const result = profileSchema.safeParse({
      name: "a".repeat(101),
      phone: "0102030405",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un téléphone avec +225", () => {
    const result = profileSchema.safeParse({
      name: "Amadou",
      phone: "+2250102030405",
    });
    expect(result.success).toBe(true);
  });

  it("nettoie les espaces dans le téléphone", () => {
    const result = profileSchema.safeParse({
      name: "Amadou",
      phone: "01 02 03 04 05",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("0102030405");
    }
  });

  it("rejette un numéro invalide", () => {
    const result = profileSchema.safeParse({
      name: "Amadou",
      phone: "12345",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const validPasswords = {
    currentPassword: "ancienMotDePasse",
    newPassword: "nouveauMotDePasse123",
    confirmPassword: "nouveauMotDePasse123",
  };

  it("accepte des mots de passe valides qui correspondent", () => {
    const result = changePasswordSchema.safeParse(validPasswords);
    expect(result.success).toBe(true);
  });

  it("rejette si les mots de passe ne correspondent pas", () => {
    const result = changePasswordSchema.safeParse({
      ...validPasswords,
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten();
      expect(errors.fieldErrors.confirmPassword).toBeDefined();
    }
  });

  it("rejette un nouveau mot de passe trop court (<8)", () => {
    const result = changePasswordSchema.safeParse({
      ...validPasswords,
      newPassword: "court",
      confirmPassword: "court",
    });
    expect(result.success).toBe(false);
  });

  it("rejette un mot de passe actuel vide", () => {
    const result = changePasswordSchema.safeParse({
      ...validPasswords,
      currentPassword: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejette une confirmation vide", () => {
    const result = changePasswordSchema.safeParse({
      ...validPasswords,
      confirmPassword: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un mot de passe de exactement 8 caractères", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "ancien",
      newPassword: "12345678",
      confirmPassword: "12345678",
    });
    expect(result.success).toBe(true);
  });
});
