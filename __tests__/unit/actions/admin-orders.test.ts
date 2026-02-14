import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession, mockCustomerSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  queryFirst: vi.fn(),
  execute: vi.fn(),
  refundOrderStock: vi.fn(),
  getAdminOrders: vi.fn(),
  getAdminOrderCount: vi.fn(),
  notifyOrderStatusUpdate: vi.fn(),
  dbPrepare: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/db", () => ({
  queryFirst: mocks.queryFirst,
  execute: mocks.execute,
}));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: vi.fn().mockResolvedValue({
    prepare: mocks.dbPrepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }) }),
    }),
  }),
}));
vi.mock("@/lib/db/orders", () => ({ refundOrderStock: mocks.refundOrderStock }));
vi.mock("@/lib/db/admin/orders", () => ({
  getAdminOrders: mocks.getAdminOrders,
  getAdminOrderCount: mocks.getAdminOrderCount,
}));
vi.mock("@/lib/notifications", () => ({
  notifyOrderStatusUpdate: mocks.notifyOrderStatusUpdate.mockResolvedValue(undefined),
}));
vi.mock("@/lib/csv/orders", () => ({ ordersToCSV: vi.fn().mockReturnValue("csv-data") }));
vi.mock("nanoid", () => ({ nanoid: vi.fn().mockReturnValue("mock-id") }));

import {
  updateOrderStatus,
  cancelOrderAdmin,
  processReturn,
  exportOrdersCSV,
  updateInternalNotes,
} from "@/actions/admin/orders";

const mockOrder = {
  id: "order-1",
  order_number: "ORD-ABC123",
  user_id: "user-1",
  status: "pending",
  delivery_person_name: null,
};

describe("updateOrderStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.queryFirst
      .mockResolvedValueOnce(mockOrder)
      .mockResolvedValue({ email: "c@t.com", name: "Client" });
    mocks.refundOrderStock.mockResolvedValue({ itemsRefunded: 2 });
  });

  it("confirme une commande pending", async () => {
    const result = await updateOrderStatus("order-1", "confirmed");
    expect(result.success).toBe(true);
  });

  it("rejette une transition invalide (pending → delivered)", async () => {
    const result = await updateOrderStatus("order-1", "delivered");
    expect(result.success).toBe(false);
    expect(result.error).toContain("non autorisée");
  });

  it("rejette un ID vide", async () => {
    const result = await updateOrderStatus("", "confirmed");
    expect(result.success).toBe(false);
  });

  it("rejette si la commande n'existe pas", async () => {
    mocks.queryFirst.mockReset().mockResolvedValue(null);
    const result = await updateOrderStatus("order-x", "confirmed");
    expect(result.success).toBe(false);
    expect(result.error).toContain("introuvable");
  });

  it("rembourse le stock pour une annulation", async () => {
    mocks.queryFirst
      .mockReset()
      .mockResolvedValueOnce({ ...mockOrder, status: "confirmed" })
      .mockResolvedValue({ email: "c@t.com", name: "C" });
    await updateOrderStatus("order-1", "cancelled");
    expect(mocks.refundOrderStock).toHaveBeenCalledWith("order-1");
  });

  it("redirige si non admin", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(updateOrderStatus("order-1", "confirmed")).rejects.toThrow("NEXT_REDIRECT");
  });
});

describe("cancelOrderAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.queryFirst
      .mockResolvedValueOnce(mockOrder)
      .mockResolvedValue({ email: "c@t.com", name: "C" });
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
    mocks.refundOrderStock.mockResolvedValue({ itemsRefunded: 1 });
  });

  it("annule une commande pending", async () => {
    const result = await cancelOrderAdmin("order-1", "Stock épuisé");
    expect(result.success).toBe(true);
  });

  it("rejette une annulation depuis 'delivered'", async () => {
    mocks.queryFirst.mockReset().mockResolvedValueOnce({ ...mockOrder, status: "delivered" });
    const result = await cancelOrderAdmin("order-1", "Raison");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Impossible");
  });

  it("rejette sans raison", async () => {
    const result = await cancelOrderAdmin("order-1", "");
    expect(result.success).toBe(false);
  });

  it("rembourse le stock par défaut", async () => {
    await cancelOrderAdmin("order-1", "Raison");
    expect(mocks.refundOrderStock).toHaveBeenCalledWith("order-1");
  });

  it("ne rembourse pas le stock si refundStock=false", async () => {
    await cancelOrderAdmin("order-1", "Raison", false);
    expect(mocks.refundOrderStock).not.toHaveBeenCalled();
  });
});

describe("processReturn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.queryFirst
      .mockResolvedValueOnce({ ...mockOrder, status: "delivered" })
      .mockResolvedValue({ email: "c@t.com", name: "C" });
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
    mocks.refundOrderStock.mockResolvedValue({ itemsRefunded: 1 });
  });

  it("traite un retour sur commande livrée", async () => {
    const result = await processReturn("order-1", "Produit défectueux");
    expect(result.success).toBe(true);
    expect(mocks.refundOrderStock).toHaveBeenCalled();
  });

  it("rejette un retour sur commande pending", async () => {
    mocks.queryFirst.mockReset().mockResolvedValueOnce({ ...mockOrder, status: "pending" });
    const result = await processReturn("order-1", "Raison");
    expect(result.success).toBe(false);
  });

  it("rejette sans raison", async () => {
    const result = await processReturn("order-1", "");
    expect(result.success).toBe(false);
  });
});

describe("exportOrdersCSV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("exporte les commandes en CSV", async () => {
    mocks.getAdminOrderCount.mockResolvedValue(5);
    mocks.getAdminOrders.mockResolvedValue([]);
    const result = await exportOrdersCSV({});
    expect(result.success).toBe(true);
    expect(result.csv).toBeDefined();
  });

  it("retourne une erreur si aucune commande", async () => {
    mocks.getAdminOrderCount.mockResolvedValue(0);
    const result = await exportOrdersCSV({});
    expect(result.success).toBe(false);
    expect(result.error).toContain("Aucune");
  });

  it("avertit si plus de 10000 commandes", async () => {
    mocks.getAdminOrderCount.mockResolvedValue(15000);
    mocks.getAdminOrders.mockResolvedValue([]);
    const result = await exportOrdersCSV({});
    expect(result.success).toBe(true);
    expect(result.warning).toContain("10000");
  });
});

describe("updateInternalNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
  });

  it("met à jour les notes internes", async () => {
    const result = await updateInternalNotes("order-1", "Note importante");
    expect(result.success).toBe(true);
  });

  it("rejette un ID vide", async () => {
    const result = await updateInternalNotes("", "Note");
    expect(result.success).toBe(false);
  });

  it("rejette des notes trop longues (>5000)", async () => {
    const result = await updateInternalNotes("order-1", "a".repeat(5001));
    expect(result.success).toBe(false);
  });
});
