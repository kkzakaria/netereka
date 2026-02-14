import { describe, it, expect } from "vitest";
import { ordersToCSV } from "@/lib/csv/orders";
import type { AdminOrder } from "@/lib/db/types";

function makeOrder(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: "order-1",
    order_number: "ORD-ABC123",
    user_id: "user-1",
    user_name: "Koné Amadou",
    user_email: "kone@example.com",
    status: "pending",
    subtotal: 50000,
    delivery_fee: 2000,
    discount_amount: 0,
    total: 52000,
    delivery_phone: "0102030405",
    delivery_commune: "Cocody",
    delivery_address: "Rue des Jardins",
    delivery_instructions: null,
    promo_code_id: null,
    promo_code: null,
    estimated_delivery: null,
    cancellation_reason: null,
    item_count: 2,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    confirmed_at: null,
    preparing_at: null,
    shipping_at: null,
    delivered_at: null,
    cancelled_at: null,
    returned_at: null,
    ...overrides,
  } as AdminOrder;
}

describe("ordersToCSV", () => {
  it("génère un CSV avec les en-têtes corrects", () => {
    const csv = ordersToCSV([]);
    const headers = csv.split("\n")[0];
    expect(headers).toContain("Numéro");
    expect(headers).toContain("Client");
    expect(headers).toContain("Total");
    expect(headers).toContain("Statut");
  });

  it("génère une ligne par commande", () => {
    const csv = ordersToCSV([makeOrder(), makeOrder({ id: "order-2" })]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // 1 header + 2 rows
  });

  it("inclut le numéro de commande", () => {
    const csv = ordersToCSV([makeOrder()]);
    expect(csv).toContain("ORD-ABC123");
  });

  it("traduit le statut en français", () => {
    const csv = ordersToCSV([makeOrder({ status: "delivered" })]);
    expect(csv).toContain("Livrée");
  });

  it("échappe les valeurs contenant des virgules", () => {
    const csv = ordersToCSV([
      makeOrder({ delivery_address: "Rue 12, Cocody, Abidjan" }),
    ]);
    // La valeur avec virgules doit être entourée de guillemets
    expect(csv).toContain('"Rue 12, Cocody, Abidjan"');
  });

  it("échappe les valeurs contenant des guillemets", () => {
    const csv = ordersToCSV([
      makeOrder({ user_name: 'Amadou "Le Grand"' }),
    ]);
    // Les guillemets doivent être doublés
    expect(csv).toContain('"Amadou ""Le Grand"""');
  });

  it("inclut les montants numériques", () => {
    const csv = ordersToCSV([
      makeOrder({ subtotal: 75000, delivery_fee: 3000, total: 78000 }),
    ]);
    expect(csv).toContain("75000");
    expect(csv).toContain("3000");
    expect(csv).toContain("78000");
  });

  it("retourne uniquement les en-têtes pour un tableau vide", () => {
    const csv = ordersToCSV([]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1);
  });
});
