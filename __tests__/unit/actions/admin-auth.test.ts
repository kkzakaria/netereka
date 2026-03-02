import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockCustomerSession,
  mockAdminSession,
  mockSuperAdminSession,
  mockAgentSession,
} from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({
    api: {
      getSession: mocks.getSession,
      signOut: mocks.signOut,
    },
  }),
}));

import { verifyAdminRole } from "@/actions/admin/auth";

describe("verifyAdminRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue(undefined);
  });

  it("retourne success pour un agent", async () => {
    mocks.getSession.mockResolvedValue(mockAgentSession);
    const result = await verifyAdminRole();
    expect(result.success).toBe(true);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("retourne success pour un admin", async () => {
    mocks.getSession.mockResolvedValue(mockAdminSession);
    const result = await verifyAdminRole();
    expect(result.success).toBe(true);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("retourne success pour un super_admin", async () => {
    mocks.getSession.mockResolvedValue(mockSuperAdminSession);
    const result = await verifyAdminRole();
    expect(result.success).toBe(true);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("refuse un customer et le déconnecte", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    const result = await verifyAdminRole();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("refuse si non authentifié (session null) sans appeler signOut", async () => {
    mocks.getSession.mockResolvedValue(null);
    const result = await verifyAdminRole();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
