import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  orderConfirmationEmail,
  orderStatusUpdateEmail,
  type OrderEmailData,
  type StatusUpdateEmailData,
} from "@/lib/notifications/templates";

function makeOrderData(overrides: Partial<OrderEmailData> = {}): OrderEmailData {
  return {
    customerName: "Koné Amadou",
    orderNumber: "ORD-ABC123",
    items: [
      {
        productName: "iPhone 15",
        variantName: null,
        quantity: 1,
        unitPrice: 750000,
        totalPrice: 750000,
      },
    ],
    subtotal: 750000,
    deliveryFee: 2000,
    discountAmount: 0,
    total: 752000,
    deliveryAddress: "Rue des Jardins, Cocody, Abidjan",
    deliveryCommune: "Cocody",
    estimatedDelivery: null,
    ...overrides,
  };
}

// ─── escapeHtml ───

describe("escapeHtml", () => {
  it("échappe les chevrons", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("échappe les ampersands", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  it("échappe les guillemets", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("échappe tous les caractères dangereux ensemble", () => {
    expect(escapeHtml('<img src="x" onerror="alert(1)">')).toBe(
      "&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;"
    );
  });

  it("échappe les apostrophes", () => {
    expect(escapeHtml("l'iPhone")).toBe("l&#39;iPhone");
  });

  it("ne modifie pas le texte normal", () => {
    expect(escapeHtml("Bonjour le monde")).toBe("Bonjour le monde");
  });
});

// ─── orderConfirmationEmail ───

describe("orderConfirmationEmail", () => {
  it("génère un sujet avec le numéro de commande", () => {
    const { subject } = orderConfirmationEmail(makeOrderData());
    expect(subject).toContain("ORD-ABC123");
    expect(subject).toContain("NETEREKA");
  });

  it("génère un HTML valide avec DOCTYPE", () => {
    const { html } = orderConfirmationEmail(makeOrderData());
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("</html>");
  });

  it("contient le nom du client", () => {
    const { html } = orderConfirmationEmail(makeOrderData());
    expect(html).toContain("Koné Amadou");
  });

  it("contient le numéro de commande", () => {
    const { html } = orderConfirmationEmail(makeOrderData());
    expect(html).toContain("ORD-ABC123");
  });

  it("contient les noms des produits", () => {
    const { html } = orderConfirmationEmail(makeOrderData());
    expect(html).toContain("iPhone 15");
  });

  it("affiche le nom de la variante si présent", () => {
    const data = makeOrderData({
      items: [
        {
          productName: "iPhone 15",
          variantName: "256 Go Noir",
          quantity: 1,
          unitPrice: 850000,
          totalPrice: 850000,
        },
      ],
    });
    const { html } = orderConfirmationEmail(data);
    expect(html).toContain("256 Go Noir");
  });

  it("contient l'adresse de livraison", () => {
    const { html } = orderConfirmationEmail(makeOrderData());
    expect(html).toContain("Rue des Jardins, Cocody, Abidjan");
  });

  it("affiche la livraison estimée si fournie", () => {
    const data = makeOrderData({
      estimatedDelivery: "2024-01-20T14:00:00Z",
    });
    const { html } = orderConfirmationEmail(data);
    expect(html).toContain("Livraison estimée");
  });

  it("n'affiche pas la livraison estimée si null", () => {
    const { html } = orderConfirmationEmail(makeOrderData());
    expect(html).not.toContain("Livraison estimée");
  });

  it("affiche la ligne de réduction si > 0", () => {
    const data = makeOrderData({ discountAmount: 10000 });
    const { html } = orderConfirmationEmail(data);
    expect(html).toContain("Réduction");
  });

  it("n'affiche pas la ligne de réduction si 0", () => {
    const data = makeOrderData({ discountAmount: 0 });
    const { html } = orderConfirmationEmail(data);
    expect(html).not.toContain("Réduction");
  });

  it("affiche 'Gratuite' si les frais de livraison sont 0", () => {
    const data = makeOrderData({ deliveryFee: 0 });
    const { html } = orderConfirmationEmail(data);
    expect(html).toContain("Gratuite");
  });

  it("contient le rappel de paiement à la livraison", () => {
    const { html } = orderConfirmationEmail(makeOrderData());
    expect(html).toContain("Paiement à la livraison");
  });

  it("contient le header NETEREKA", () => {
    const { html } = orderConfirmationEmail(makeOrderData());
    expect(html).toContain("NETEREKA");
    expect(html).toContain("Electronic");
  });

  it("échappe les caractères HTML dans le nom du client", () => {
    const data = makeOrderData({ customerName: '<script>alert("xss")</script>' });
    const { html } = orderConfirmationEmail(data);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("affiche les prix formatés dans le récapitulatif", () => {
    const { html } = orderConfirmationEmail(makeOrderData());
    // Le total (752 000) doit apparaître — le séparateur de milliers varie selon la locale
    expect(html).toMatch(/752[\s\u202f\u00a0]?000/);
  });

  it("affiche la quantité pour chaque article", () => {
    const data = makeOrderData({
      items: [
        { productName: "Cable USB", variantName: null, quantity: 3, unitPrice: 5000, totalPrice: 15000 },
      ],
    });
    const { html } = orderConfirmationEmail(data);
    expect(html).toContain("x3");
  });
});

// ─── orderStatusUpdateEmail ───

describe("orderStatusUpdateEmail", () => {
  const baseData = {
    customerName: "Koné Amadou",
    orderNumber: "ORD-XYZ789",
  } satisfies Omit<StatusUpdateEmailData, "newStatus">;

  it("génère un email pour le statut 'confirmed'", () => {
    const result = orderStatusUpdateEmail({ ...baseData, newStatus: "confirmed" });
    expect(result).not.toBeNull();
    expect(result!.subject).toContain("Commande confirmée");
    expect(result!.html).toContain("confirmée");
  });

  it("génère un email pour le statut 'preparing'", () => {
    const result = orderStatusUpdateEmail({ ...baseData, newStatus: "preparing" });
    expect(result).not.toBeNull();
    expect(result!.subject).toContain("préparation");
    expect(result!.html).toContain("préparation");
  });

  it("génère un email pour le statut 'shipping' avec livreur", () => {
    const result = orderStatusUpdateEmail({
      ...baseData,
      newStatus: "shipping",
      deliveryPersonName: "Moussa K.",
    });
    expect(result).not.toBeNull();
    expect(result!.html).toContain("Moussa K.");
    expect(result!.html).toContain("livraison");
  });

  it("génère un email pour 'shipping' sans livreur", () => {
    const result = orderStatusUpdateEmail({ ...baseData, newStatus: "shipping" });
    expect(result).not.toBeNull();
    expect(result!.html).toContain("livraison");
    expect(result!.html).not.toContain("Votre livreur");
  });

  it("génère un email pour le statut 'delivered'", () => {
    const result = orderStatusUpdateEmail({ ...baseData, newStatus: "delivered" });
    expect(result).not.toBeNull();
    expect(result!.html).toContain("livrée avec succès");
    expect(result!.html).toContain("laisser un avis");
  });

  it("génère un email pour 'cancelled' avec raison", () => {
    const result = orderStatusUpdateEmail({
      ...baseData,
      newStatus: "cancelled",
      reason: "Stock épuisé",
    });
    expect(result).not.toBeNull();
    expect(result!.html).toContain("annulée");
    expect(result!.html).toContain("Stock épuisé");
  });

  it("génère un email pour 'cancelled' sans raison", () => {
    const result = orderStatusUpdateEmail({ ...baseData, newStatus: "cancelled" });
    expect(result).not.toBeNull();
    expect(result!.html).toContain("annulée");
  });

  it("génère un email pour 'returned' avec raison", () => {
    const result = orderStatusUpdateEmail({
      ...baseData,
      newStatus: "returned",
      reason: "Produit défectueux",
    });
    expect(result).not.toBeNull();
    expect(result!.html).toContain("retour");
    expect(result!.html).toContain("Produit défectueux");
  });

  it("retourne null pour le statut 'pending' (pas de template)", () => {
    const result = orderStatusUpdateEmail({ ...baseData, newStatus: "pending" });
    expect(result).toBeNull();
  });

  it("contient le numéro de commande dans le sujet", () => {
    const result = orderStatusUpdateEmail({ ...baseData, newStatus: "confirmed" });
    expect(result!.subject).toContain("ORD-XYZ789");
  });

  it("contient le nom du client", () => {
    const result = orderStatusUpdateEmail({ ...baseData, newStatus: "confirmed" });
    expect(result!.html).toContain("Koné Amadou");
  });

  it("échappe le HTML dans le nom du livreur", () => {
    const result = orderStatusUpdateEmail({
      ...baseData,
      newStatus: "shipping",
      deliveryPersonName: '<img onerror="hack">',
    });
    expect(result!.html).not.toContain("<img");
    expect(result!.html).toContain("&lt;img");
  });

  it("échappe le HTML dans la raison d'annulation", () => {
    const result = orderStatusUpdateEmail({
      ...baseData,
      newStatus: "cancelled",
      reason: '<script>alert("xss")</script>',
    });
    expect(result!.html).not.toContain("<script>");
  });
});
