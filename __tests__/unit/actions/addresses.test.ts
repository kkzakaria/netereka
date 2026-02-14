import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockCustomerSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  createAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
  setDefaultAddress: vi.fn(),
  getAddressById: vi.fn(),
  getDeliveryZoneByCommune: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/db/addresses", () => ({
  createAddress: mocks.createAddress,
  updateAddress: mocks.updateAddress,
  deleteAddress: mocks.deleteAddress,
  setDefaultAddress: mocks.setDefaultAddress,
  getAddressById: mocks.getAddressById,
}));
vi.mock("@/lib/db/delivery-zones", () => ({
  getDeliveryZoneByCommune: mocks.getDeliveryZoneByCommune,
}));

import {
  createAddressAction,
  updateAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/actions/addresses";

const validAddress = {
  label: "Maison",
  fullName: "Koné Amadou",
  phone: "0102030405",
  street: "Rue des Jardins, Cocody",
  commune: "Cocody",
  city: "Abidjan",
};

describe("createAddressAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    mocks.getDeliveryZoneByCommune.mockResolvedValue({ id: "zone-1" });
    mocks.createAddress.mockResolvedValue(undefined);
  });

  it("crée une adresse avec des données valides", async () => {
    const result = await createAddressAction(validAddress);
    expect(result.success).toBe(true);
    expect(mocks.createAddress).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", commune: "Cocody", zoneId: "zone-1" })
    );
  });

  it("crée une adresse même sans zone (zoneId null)", async () => {
    mocks.getDeliveryZoneByCommune.mockResolvedValue(null);
    const result = await createAddressAction(validAddress);
    expect(result.success).toBe(true);
    expect(mocks.createAddress).toHaveBeenCalledWith(expect.objectContaining({ zoneId: null }));
  });

  it("rejette les données invalides", async () => {
    const result = await createAddressAction({ ...validAddress, fullName: "A" });
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("rejette un numéro de téléphone invalide", async () => {
    const result = await createAddressAction({ ...validAddress, phone: "12345" });
    expect(result.success).toBe(false);
  });
});

describe("updateAddressAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    mocks.getAddressById.mockResolvedValue({ id: "addr-1" });
    mocks.getDeliveryZoneByCommune.mockResolvedValue({ id: "zone-1" });
    mocks.updateAddress.mockResolvedValue(undefined);
  });

  it("met à jour une adresse existante", async () => {
    const result = await updateAddressAction("addr-1", validAddress);
    expect(result.success).toBe(true);
  });

  it("rejette si l'adresse n'existe pas", async () => {
    mocks.getAddressById.mockResolvedValue(null);
    const result = await updateAddressAction("addr-x", validAddress);
    expect(result.success).toBe(false);
    expect(result.error).toContain("introuvable");
  });

  it("rejette les données invalides", async () => {
    const result = await updateAddressAction("addr-1", { ...validAddress, street: "AB" });
    expect(result.success).toBe(false);
  });
});

describe("deleteAddressAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockCustomerSession);
  });

  it("supprime une adresse", async () => {
    mocks.deleteAddress.mockResolvedValue(true);
    const result = await deleteAddressAction("addr-1");
    expect(result.success).toBe(true);
  });

  it("rejette si l'adresse n'existe pas", async () => {
    mocks.deleteAddress.mockResolvedValue(false);
    const result = await deleteAddressAction("addr-x");
    expect(result.success).toBe(false);
    expect(result.error).toContain("introuvable");
  });
});

describe("setDefaultAddressAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockCustomerSession);
  });

  it("définit une adresse par défaut", async () => {
    mocks.setDefaultAddress.mockResolvedValue(true);
    const result = await setDefaultAddressAction("addr-1");
    expect(result.success).toBe(true);
  });

  it("rejette si l'adresse n'existe pas", async () => {
    mocks.setDefaultAddress.mockResolvedValue(false);
    const result = await setDefaultAddressAction("addr-x");
    expect(result.success).toBe(false);
  });
});
