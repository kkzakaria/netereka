import { describe, expect, it } from "vitest";
import { aiPromptSchema } from "@/lib/validations/product-ai";

describe("aiPromptSchema", () => {
  it("accepte un prompt normal", () => {
    expect(aiPromptSchema.safeParse("Samsung Galaxy A55").success).toBe(true);
  });

  it("trim les espaces", () => {
    const r = aiPromptSchema.safeParse("  iPhone 15 Pro  ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("iPhone 15 Pro");
  });

  it("rejette trop court (< 3 chars après trim)", () => {
    expect(aiPromptSchema.safeParse("  a ").success).toBe(false);
  });

  it("rejette trop long (> 200 chars)", () => {
    expect(aiPromptSchema.safeParse("x".repeat(201)).success).toBe(false);
  });

  it("rejette les caractères de contrôle", () => {
    expect(aiPromptSchema.safeParse("Galaxy\x00A55").success).toBe(false);
    expect(aiPromptSchema.safeParse("Galaxy\nA55").success).toBe(false);
  });
});
