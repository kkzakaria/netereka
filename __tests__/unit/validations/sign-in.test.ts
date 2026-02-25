import { describe, it, expect } from "vitest";
import { signInSchema } from "@/lib/validations/sign-in";

describe("signInSchema", () => {
  const valid = { email: "user@exemple.com", password: "motdepasse" };

  it("accepte des identifiants valides", () => {
    expect(signInSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette un email invalide", () => {
    const result = signInSchema.safeParse({ ...valid, email: "pas-un-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it("rejette un email vide", () => {
    const result = signInSchema.safeParse({ ...valid, email: "" });
    expect(result.success).toBe(false);
  });

  it("rejette un mot de passe vide", () => {
    const result = signInSchema.safeParse({ ...valid, password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined();
    }
  });

  it("accepte un mot de passe d'un seul caractère", () => {
    expect(signInSchema.safeParse({ ...valid, password: "a" }).success).toBe(true);
  });
});
