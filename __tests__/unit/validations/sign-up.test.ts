import { describe, it, expect } from "vitest";
import { signUpSchema } from "@/lib/validations/sign-up";

const validData = {
  name: "Jean Kouamé",
  email: "jean@exemple.com",
  phone: "+225 07 00 00 00 00",
  password: "motdepasse123",
  confirmPassword: "motdepasse123",
};

describe("signUpSchema — champs de base", () => {
  it("accepte des données valides complètes", () => {
    expect(signUpSchema.safeParse(validData).success).toBe(true);
  });

  it("rejette un nom vide", () => {
    const result = signUpSchema.safeParse({ ...validData, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    }
  });

  it("rejette un email invalide", () => {
    const result = signUpSchema.safeParse({ ...validData, email: "pas-un-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it("rejette un mot de passe de 7 caractères", () => {
    const result = signUpSchema.safeParse({
      ...validData,
      password: "court12",
      confirmPassword: "court12",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    }
  });

  it("accepte un mot de passe d'exactement 8 caractères", () => {
    expect(
      signUpSchema.safeParse({
        ...validData,
        password: "12345678",
        confirmPassword: "12345678",
      }).success
    ).toBe(true);
  });
});

describe("signUpSchema — confirmation du mot de passe", () => {
  it("rejette si les mots de passe ne correspondent pas", () => {
    const result = signUpSchema.safeParse({
      ...validData,
      password: "motdepasse123",
      confirmPassword: "different456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined();
    }
  });

  it("l'erreur de confirmation est bien sur le champ confirmPassword", () => {
    const result = signUpSchema.safeParse({
      ...validData,
      confirmPassword: "autreMot",
    });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.confirmPassword).toBeDefined();
      expect(errors.password).toBeUndefined();
    }
  });
});

describe("signUpSchema — numéro de téléphone ivoirien", () => {
  it("accepte le format espacé +225 07 00 00 00 00", () => {
    expect(
      signUpSchema.safeParse({ ...validData, phone: "+225 07 00 00 00 00" }).success
    ).toBe(true);
  });

  it("accepte le format compact +2250700000000", () => {
    expect(
      signUpSchema.safeParse({ ...validData, phone: "+2250700000000" }).success
    ).toBe(true);
  });

  it("accepte +225 suivi de 10 chiffres consécutifs", () => {
    expect(
      signUpSchema.safeParse({ ...validData, phone: "+225 0700000000" }).success
    ).toBe(true);
  });

  it("rejette un numéro sans préfixe +225", () => {
    expect(
      signUpSchema.safeParse({ ...validData, phone: "0700000000" }).success
    ).toBe(false);
  });

  it("rejette un numéro avec trop peu de chiffres", () => {
    expect(
      signUpSchema.safeParse({ ...validData, phone: "+225 07 00 00 00" }).success
    ).toBe(false);
  });

  it("rejette un numéro vide", () => {
    expect(signUpSchema.safeParse({ ...validData, phone: "" }).success).toBe(false);
  });

  it("rejette un numéro contenant des lettres", () => {
    expect(
      signUpSchema.safeParse({ ...validData, phone: "+225 07 00 00 00 ab" }).success
    ).toBe(false);
  });
});
