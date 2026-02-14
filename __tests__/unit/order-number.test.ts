import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "@/lib/db/orders";

describe("generateOrderNumber", () => {
  it("commence par ORD-", () => {
    const num = generateOrderNumber();
    expect(num).toMatch(/^ORD-/);
  });

  it("a exactement 10 caractères (ORD- + 6)", () => {
    const num = generateOrderNumber();
    expect(num).toHaveLength(10);
  });

  it("ne contient que des caractères alphanumériques après ORD-", () => {
    const num = generateOrderNumber();
    const suffix = num.slice(4);
    expect(suffix).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("génère des numéros différents (probabiliste)", () => {
    const numbers = new Set(Array.from({ length: 100 }, () => generateOrderNumber()));
    // 36^6 = ~2 milliards de combinaisons, 100 devraient toutes être uniques
    expect(numbers.size).toBe(100);
  });
});
