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
  cancelOrderFromStatus: vi.fn(),
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
vi.mock("@/lib/db/orders", () => ({
  refundOrderStock: mocks.refundOrderStock,
  cancelOrderFromStatus: mocks.cancelOrderFromStatus,
}));
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
  assignDeliveryPerson,
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
    // Fresh default for every test: the guarded UPDATE (and any other
    // db.prepare(...).bind(...).run() call, e.g. addStatusHistory's INSERT)
    // succeeds unless a specific test overrides it below.
    mocks.dbPrepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }) }),
    });
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

  // Proves the guarded UPDATE actually carries the current status as a WHERE
  // predicate — this is the mechanism, not just its effect.
  it("inclut le statut courant comme garde dans la clause WHERE de la transition", async () => {
    const runMock = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
    const bindMock = vi.fn().mockReturnValue({ run: runMock });
    mocks.dbPrepare.mockReturnValue({ bind: bindMock });

    await updateOrderStatus("order-1", "confirmed");

    expect(bindMock).toHaveBeenCalledWith("confirmed", "order-1", "pending");
  });

  // This is the direct proof for the race the sweep introduced: if the row's
  // status changed between this action's read and its write (e.g. the
  // hourly stale-order sweep cancelled the same pending order concurrently),
  // the guarded UPDATE affects 0 rows and this action must stop entirely —
  // no history entry, no refund, no customer notification for a transition
  // it never actually performed. The pre-fix code had no WHERE guard at all
  // and no changes check, so this test fails against it (it always reached
  // refund/notification unconditionally).
  it("n'ajoute pas d'historique, ne rembourse pas et ne notifie pas si le statut a changé entre-temps", async () => {
    mocks.queryFirst
      .mockReset()
      .mockResolvedValueOnce({ ...mockOrder, status: "confirmed" })
      .mockResolvedValue({ email: "c@t.com", name: "C" });
    mocks.dbPrepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }) }),
    });

    const result = await updateOrderStatus("order-1", "cancelled");

    expect(result.success).toBe(false);
    expect(mocks.refundOrderStock).not.toHaveBeenCalled();
    expect(mocks.notifyOrderStatusUpdate).not.toHaveBeenCalled();
  });

  // A cancelled order whose stock was never returned is the state the
  // compensation exists to prevent, so the revert must actually run and the
  // action must report failure rather than a success it did not achieve.
  it("revient au statut précédent et signale l'échec si le remboursement du stock échoue", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.queryFirst
      .mockReset()
      .mockResolvedValueOnce({ ...mockOrder, status: "confirmed" })
      .mockResolvedValue({ email: "c@t.com", name: "C" });
    mocks.refundOrderStock.mockRejectedValue(new Error("D1 batch failed"));
    const bindMock = vi.fn().mockReturnValue({
      run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    });
    mocks.dbPrepare.mockReturnValue({ bind: bindMock });

    const result = await updateOrderStatus("order-1", "cancelled");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/remise à son statut précédent/i);
    // Second prepare/bind = the compensating revert back to 'confirmed',
    // guarded on the status this call just wrote.
    expect(bindMock).toHaveBeenCalledWith("confirmed", "order-1", "cancelled");
    expect(mocks.notifyOrderStatusUpdate).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  // The revert is a second, independent D1 call and can fail on its own.
  // It must not escape as an unhandled rejection: the caller still needs an
  // ActionResult, and its wording must not claim a revert that never
  // happened — "reverted" and "could not revert" are different incidents.
  it("renvoie un échec explicite, sans lever, si la tentative de retour arrière échoue aussi", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.queryFirst
      .mockReset()
      .mockResolvedValueOnce({ ...mockOrder, status: "confirmed" })
      .mockResolvedValue({ email: "c@t.com", name: "C" });
    mocks.refundOrderStock.mockRejectedValue(new Error("D1 batch failed"));
    mocks.dbPrepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi
          .fn()
          .mockResolvedValueOnce({ meta: { changes: 1 } })
          .mockRejectedValueOnce(new Error("D1 unavailable during revert")),
      }),
    });

    const result = await updateOrderStatus("order-1", "cancelled");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/vérification manuelle/i);
    expect(result.error).not.toMatch(/remise à son statut précédent/i);
    const call = errorSpy.mock.calls.find((c) => /revert also failed/i.test(String(c[0])));
    expect(call).toBeDefined();
    const [message, context, refundErr, revertErr] = call!;
    expect(message).toMatch(/revert also failed/i);
    expect(context).toMatchObject({ orderId: "order-1", intendedRevertTo: "confirmed" });
    expect(refundErr).toBeInstanceOf(Error);
    expect(revertErr).toBeInstanceOf(Error);
    errorSpy.mockRestore();
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
    mocks.cancelOrderFromStatus.mockResolvedValue(true);
  });

  it("annule une commande pending", async () => {
    const result = await cancelOrderAdmin("order-1", "Stock épuisé");
    expect(result.success).toBe(true);
    expect(mocks.cancelOrderFromStatus).toHaveBeenCalledWith("order-1", "pending", "Stock épuisé", {
      refund: true,
    });
  });

  it("rejette une annulation depuis 'delivered'", async () => {
    mocks.queryFirst.mockReset().mockResolvedValueOnce({ ...mockOrder, status: "delivered" });
    const result = await cancelOrderAdmin("order-1", "Raison");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Impossible");
    expect(mocks.cancelOrderFromStatus).not.toHaveBeenCalled();
  });

  it("rejette sans raison", async () => {
    const result = await cancelOrderAdmin("order-1", "");
    expect(result.success).toBe(false);
  });

  it("rembourse le stock par défaut", async () => {
    await cancelOrderAdmin("order-1", "Raison");
    expect(mocks.cancelOrderFromStatus).toHaveBeenCalledWith("order-1", "pending", "Raison", {
      refund: true,
    });
  });

  it("ne rembourse pas le stock si refundStock=false", async () => {
    await cancelOrderAdmin("order-1", "Raison", false);
    expect(mocks.cancelOrderFromStatus).toHaveBeenCalledWith("order-1", "pending", "Raison", {
      refund: false,
    });
  });

  // This is the direct proof for the headline race at the admin action's own
  // boundary: cancelOrderFromStatus (lib/db/orders.ts) reports "did not
  // transition this row" whenever a concurrent caller — the hourly
  // stale-order sweep, or another admin tab — already changed the order's
  // status. cancelOrderAdmin must treat that as a hard stop: no history
  // entry, no notification, and (implicitly, since it never even calls
  // refundOrderStock directly anymore) no second refund attempt layered on
  // top of whatever cancelOrderFromStatus already did or didn't do.
  it("échoue proprement, sans historique ni notification, si la transition a déjà eu lieu ailleurs (ex: la purge concurrente)", async () => {
    mocks.cancelOrderFromStatus.mockResolvedValue(false);

    const result = await cancelOrderAdmin("order-1", "Raison");

    expect(result.success).toBe(false);
    expect(mocks.dbPrepare).not.toHaveBeenCalled(); // addStatusHistory never ran
    expect(mocks.notifyOrderStatusUpdate).not.toHaveBeenCalled();
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

  // Same guard discipline as updateOrderStatus, applied directly (not via
  // cancelOrderFromStatus, since "returned" isn't a cancellation): if the
  // row's status changed between the read above and this UPDATE, the guard
  // must reject rather than refund a transition this call never performed.
  it("échoue et ne rembourse pas si le statut a changé entre-temps (garde perdue)", async () => {
    mocks.execute.mockReset().mockResolvedValueOnce({ meta: { changes: 0 } });

    const result = await processReturn("order-1", "Produit défectueux");

    expect(result.success).toBe(false);
    expect(mocks.refundOrderStock).not.toHaveBeenCalled();
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

describe("assignDeliveryPerson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
    mocks.execute.mockResolvedValue({ meta: { changes: 1 } });
  });

  it("assigne un livreur à une commande", async () => {
    mocks.queryFirst.mockResolvedValue({ id: "delivery-1" });
    const result = await assignDeliveryPerson("order-1", "delivery-1", "Koné Livreur");
    expect(result.success).toBe(true);
    expect(mocks.execute).toHaveBeenCalled();
  });

  it("désassigne un livreur (null)", async () => {
    const result = await assignDeliveryPerson("order-1", null, null);
    expect(result.success).toBe(true);
    expect(mocks.queryFirst).not.toHaveBeenCalled();
  });

  it("rejette si le livreur n'existe pas", async () => {
    mocks.queryFirst.mockResolvedValue(null);
    const result = await assignDeliveryPerson("order-1", "unknown-id", "Inconnu");
    expect(result.success).toBe(false);
    expect(result.error).toContain("introuvable");
  });

  it("rejette un ID commande vide", async () => {
    const result = await assignDeliveryPerson("", "delivery-1", "Nom");
    expect(result.success).toBe(false);
  });

  it("redirige si non admin", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(assignDeliveryPerson("order-1", "d-1", "Nom")).rejects.toThrow("NEXT_REDIRECT");
  });
});
