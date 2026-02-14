import { describe, it, expect } from "vitest";
import {
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  isOrderStatus,
  getOrderStatus,
  isValidStatusTransition,
  getStatusTimestampField,
} from "@/lib/constants/orders";

describe("isOrderStatus", () => {
  it("reconnaît tous les statuts valides", () => {
    for (const status of ORDER_STATUSES) {
      expect(isOrderStatus(status)).toBe(true);
    }
  });

  it("rejette les statuts invalides", () => {
    expect(isOrderStatus("invalid")).toBe(false);
    expect(isOrderStatus("")).toBe(false);
    expect(isOrderStatus("PENDING")).toBe(false); // case-sensitive
  });
});

describe("getOrderStatus", () => {
  it("retourne le statut s'il est valide", () => {
    expect(getOrderStatus("pending")).toBe("pending");
    expect(getOrderStatus("delivered")).toBe("delivered");
  });

  it("retourne 'pending' comme fallback pour un statut invalide", () => {
    expect(getOrderStatus("invalid")).toBe("pending");
    expect(getOrderStatus("")).toBe("pending");
  });
});

describe("isValidStatusTransition", () => {
  // Transitions valides
  it("permet pending → confirmed", () => {
    expect(isValidStatusTransition("pending", "confirmed")).toBe(true);
  });

  it("permet pending → cancelled", () => {
    expect(isValidStatusTransition("pending", "cancelled")).toBe(true);
  });

  it("permet confirmed → preparing", () => {
    expect(isValidStatusTransition("confirmed", "preparing")).toBe(true);
  });

  it("permet confirmed → cancelled", () => {
    expect(isValidStatusTransition("confirmed", "cancelled")).toBe(true);
  });

  it("permet preparing → cancelled", () => {
    expect(isValidStatusTransition("preparing", "cancelled")).toBe(true);
  });

  it("permet preparing → shipping", () => {
    expect(isValidStatusTransition("preparing", "shipping")).toBe(true);
  });

  it("permet shipping → delivered", () => {
    expect(isValidStatusTransition("shipping", "delivered")).toBe(true);
  });

  it("permet shipping → returned", () => {
    expect(isValidStatusTransition("shipping", "returned")).toBe(true);
  });

  it("permet delivered → returned", () => {
    expect(isValidStatusTransition("delivered", "returned")).toBe(true);
  });

  // Transitions invalides
  it("interdit pending → delivered (saut d'étape)", () => {
    expect(isValidStatusTransition("pending", "delivered")).toBe(false);
  });

  it("interdit delivered → pending (retour arrière)", () => {
    expect(isValidStatusTransition("delivered", "pending")).toBe(false);
  });

  it("interdit cancelled → * (état terminal)", () => {
    for (const status of ORDER_STATUSES) {
      expect(isValidStatusTransition("cancelled", status)).toBe(false);
    }
  });

  it("interdit returned → * (état terminal)", () => {
    for (const status of ORDER_STATUSES) {
      expect(isValidStatusTransition("returned", status)).toBe(false);
    }
  });
});

describe("getStatusTimestampField", () => {
  it("retourne le champ timestamp pour chaque statut avec timestamp", () => {
    expect(getStatusTimestampField("confirmed")).toBe("confirmed_at");
    expect(getStatusTimestampField("preparing")).toBe("preparing_at");
    expect(getStatusTimestampField("shipping")).toBe("shipping_at");
    expect(getStatusTimestampField("delivered")).toBe("delivered_at");
    expect(getStatusTimestampField("cancelled")).toBe("cancelled_at");
    expect(getStatusTimestampField("returned")).toBe("returned_at");
  });

  it("retourne null pour pending (pas de timestamp)", () => {
    expect(getStatusTimestampField("pending")).toBeNull();
  });
});

describe("ORDER_STATUS_LABELS", () => {
  it("a un label pour chaque statut", () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_STATUS_LABELS[status]).toBeDefined();
      expect(typeof ORDER_STATUS_LABELS[status]).toBe("string");
    }
  });

  it("les labels sont en français", () => {
    expect(ORDER_STATUS_LABELS.pending).toBe("En attente");
    expect(ORDER_STATUS_LABELS.delivered).toBe("Livrée");
    expect(ORDER_STATUS_LABELS.cancelled).toBe("Annulée");
  });
});

describe("ORDER_STATUS_TRANSITIONS", () => {
  it("chaque statut a un tableau de transitions (même vide)", () => {
    for (const status of ORDER_STATUSES) {
      expect(Array.isArray(ORDER_STATUS_TRANSITIONS[status])).toBe(true);
    }
  });

  it("les états terminaux n'ont aucune transition", () => {
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toHaveLength(0);
    expect(ORDER_STATUS_TRANSITIONS.returned).toHaveLength(0);
  });
});
