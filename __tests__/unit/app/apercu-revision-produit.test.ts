import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * L'ordre de la garde sur la page d'aperçu PRODUIT.
 *
 * La page jumelle (bannière) avait ce test ; celle-ci non, alors qu'elle
 * porte le même enchaînement et qu'elle lit ensuite des données
 * d'administration (`getAdminProductById`). Une modification qui remonterait
 * `getRevision` au-dessus de `autoriserApercu` était donc attrapée sur une
 * page et pas sur l'autre.
 */
const mocks = vi.hoisted(() => ({
  autoriserApercu: vi.fn(),
  getRevision: vi.fn(),
  getAdminProductById: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/apercu/autorisation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apercu/autorisation")>()),
  autoriserApercu: mocks.autoriserApercu,
}));
vi.mock("@/lib/db/revisions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/revisions")>()),
  getRevision: mocks.getRevision,
}));
vi.mock("@/lib/db/admin/products", () => ({ getAdminProductById: mocks.getAdminProductById }));

import Page from "@/app/(storefront)/apercu/produit/[revisionId]/page";

const rendre = () => Page({ params: Promise.resolve({ revisionId: "rev-1" }) });

beforeEach(() => {
  // mockReset, pas clearAllMocks : l'ordre des tests est tiré au sort.
  mocks.autoriserApercu.mockReset().mockResolvedValue(undefined);
  mocks.getRevision.mockReset().mockResolvedValue(null);
  mocks.getAdminProductById.mockReset().mockResolvedValue(null);
  mocks.notFound.mockClear();
});

describe("aperçu de révision produit : la garde", () => {
  it("l'autorisation est exigée AVANT toute lecture", async () => {
    mocks.autoriserApercu.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(rendre()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.getRevision).not.toHaveBeenCalled();
    expect(mocks.getAdminProductById).not.toHaveBeenCalled();
  });

  it("l'autorisation porte le type « produit » et l'identifiant demandé", async () => {
    await expect(rendre()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.autoriserApercu).toHaveBeenCalledWith("produit", "rev-1");
  });

  it("404 sur une révision qui n'est pas celle d'un produit", async () => {
    mocks.getRevision.mockResolvedValue({ id: "rev-1", target_type: "banner" });
    await expect(rendre()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getAdminProductById).not.toHaveBeenCalled();
  });
});
