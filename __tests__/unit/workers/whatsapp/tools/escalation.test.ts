import { describe, it, expect, vi, beforeEach } from "vitest";
import { escalateHuman } from "../../../../../workers/whatsapp/src/tools/escalation";
import type { ToolContext } from "../../../../../workers/whatsapp/src/types";

const mockSendText = vi.fn().mockResolvedValue({ success: true });

vi.mock("../../../../../workers/whatsapp/src/whatsapp-api", () => ({
  WhatsAppAPI: vi.fn().mockImplementation(function () {
    return { sendText: mockSendText };
  }),
}));

function createMockD1() {
  const mockStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    run: vi.fn(),
    all: vi.fn(),
  };
  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
    _statement: mockStatement,
  };
}

function createMockCtx(mockDb: ReturnType<typeof createMockD1>): ToolContext {
  return {
    db: mockDb as unknown as D1Database,
    session: {
      id: "session-1",
      wa_phone: "2250700000000",
      user_id: null,
      pending_user_id: null,
      is_verified: 0,
      otp_code: null,
      otp_expires_at: null,
      status: "active" as const,
      created_at: "",
      updated_at: "",
    },
    env: {} as ToolContext["env"],
  };
}

describe("escalateHuman", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    vi.clearAllMocks();
  });

  it("updates session status to escalated and returns success message", async () => {
    // UPDATE session run
    mockDb._statement.run.mockResolvedValueOnce({ success: true });
    // config query
    mockDb._statement.first.mockResolvedValueOnce({
      phone_number_id: "123456",
      access_token: "token-abc",
      admin_phones: JSON.stringify(["2250101010101", "2250202020202"]),
    });

    const result = await escalateHuman(createMockCtx(mockDb), {
      reason: "Client a besoin d'aide pour une commande",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      message: expect.stringContaining("conseiller"),
    });

    // The UPDATE query should have been called
    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE whatsapp_sessions")
    );
    expect(mockDb._statement.bind).toHaveBeenCalledWith("session-1");
  });

  it("succeeds even when admin_phones is empty array", async () => {
    // UPDATE session run
    mockDb._statement.run.mockResolvedValueOnce({ success: true });
    // config with empty admin_phones
    mockDb._statement.first.mockResolvedValueOnce({
      phone_number_id: "123456",
      access_token: "token-abc",
      admin_phones: "[]",
    });

    const result = await escalateHuman(createMockCtx(mockDb), {
      reason: "Problème de livraison",
    });

    expect(result.success).toBe(true);
  });

  it("succeeds even when whatsapp_config is not found", async () => {
    // UPDATE session run
    mockDb._statement.run.mockResolvedValueOnce({ success: true });
    // no config
    mockDb._statement.first.mockResolvedValueOnce(null);

    const result = await escalateHuman(createMockCtx(mockDb), {
      reason: "Aucune config",
    });

    expect(result.success).toBe(true);
  });
});
