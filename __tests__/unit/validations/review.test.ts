import { describe, it, expect } from "vitest";
import { reviewSchema } from "@/lib/validations/review";

describe("reviewSchema", () => {
  it("accepte un avis valide", () => {
    const result = reviewSchema.safeParse({
      productId: "prod-1",
      rating: 4,
      comment: "Très bon produit",
    });
    expect(result.success).toBe(true);
  });

  it("accepte un avis sans commentaire", () => {
    const result = reviewSchema.safeParse({
      productId: "prod-1",
      rating: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejette une note à 0", () => {
    const result = reviewSchema.safeParse({
      productId: "prod-1",
      rating: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejette une note > 5", () => {
    const result = reviewSchema.safeParse({
      productId: "prod-1",
      rating: 6,
    });
    expect(result.success).toBe(false);
  });

  it("rejette une note décimale", () => {
    const result = reviewSchema.safeParse({
      productId: "prod-1",
      rating: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepte les notes de 1 à 5", () => {
    for (let rating = 1; rating <= 5; rating++) {
      const result = reviewSchema.safeParse({ productId: "prod-1", rating });
      expect(result.success).toBe(true);
    }
  });

  it("rejette un productId vide", () => {
    const result = reviewSchema.safeParse({
      productId: "",
      rating: 3,
    });
    expect(result.success).toBe(false);
  });

  it("rejette un commentaire trop long (>1000)", () => {
    const result = reviewSchema.safeParse({
      productId: "prod-1",
      rating: 3,
      comment: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});
