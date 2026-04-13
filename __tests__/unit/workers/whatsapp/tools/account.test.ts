import { describe, it, expect, vi, beforeEach } from "vitest";
import { linkAccount, verifyOtp } from "../../../../../workers/whatsapp/src/tools/account";
import type { ToolContext } from "../../../../../workers/whatsapp/src/types";

vi.mock("../../../../../workers/whatsapp/src/email", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue({ success: true }),
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

function createMockCtx(
  mockDb: ReturnType<typeof createMockD1>,
  sessionOverrides: Partial<ToolContext["session"]> = {}
): ToolContext {
  return {
    db: mockDb as unknown as D1Database,
    session: {
      id: "session-1",
      wa_phone: "2250700000000",
      user_id: null,
      is_verified: 0,
      otp_code: null,
      otp_expires_at: null,
      status: "active" as const,
      created_at: "",
      updated_at: "",
      ...sessionOverrides,
    } as ToolContext["session"],
    env: { DB: mockDb as unknown as D1Database, KV: {} as KVNamespace, AI: {} as Ai, RESEND_API_KEY: "test-key" },
  };
}

describe("linkAccount", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    vi.clearAllMocks();
  });

  it("returns error if session is already verified and linked", async () => {
    const ctx = createMockCtx(mockDb, { is_verified: 1, user_id: "user-abc" });
    const result = await linkAccount(ctx, { email: "test@example.com" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already linked/i);
  });

  it("returns error if no user found with that email", async () => {
    const ctx = createMockCtx(mockDb);
    mockDb._statement.first.mockResolvedValueOnce(null);

    const result = await linkAccount(ctx, { email: "unknown@example.com" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no account found/i);
  });

  it("sends OTP and returns success when user is found", async () => {
    const { sendOtpEmail } = await import("../../../../../workers/whatsapp/src/email");
    const ctx = createMockCtx(mockDb);

    // User lookup returns a user
    mockDb._statement.first.mockResolvedValueOnce({ id: "user-123", email: "user@example.com" });
    // UPDATE run
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await linkAccount(ctx, { email: "user@example.com" });

    expect(result.success).toBe(true);
    expect(sendOtpEmail).toHaveBeenCalledWith("test-key", "user@example.com", expect.stringMatching(/^\d{6}$/));
  });

  it("still returns success even when RESEND_API_KEY is not configured", async () => {
    const ctx = createMockCtx(mockDb);
    ctx.env.RESEND_API_KEY = undefined;

    mockDb._statement.first.mockResolvedValueOnce({ id: "user-123", email: "user@example.com" });
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await linkAccount(ctx, { email: "user@example.com" });

    expect(result.success).toBe(true);
  });
});

describe("verifyOtp", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    vi.clearAllMocks();
  });

  it("returns error if no OTP is pending", async () => {
    const ctx = createMockCtx(mockDb);
    // DB returns session with no otp_code
    mockDb._statement.first.mockResolvedValueOnce({
      otp_code: null,
      otp_expires_at: null,
      user_id: null,
    });

    const result = await verifyOtp(ctx, { code: "123456" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no verification pending/i);
  });

  it("returns error if OTP is expired", async () => {
    const ctx = createMockCtx(mockDb);
    const expiredTime = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
    mockDb._statement.first.mockResolvedValueOnce({
      otp_code: "123456",
      otp_expires_at: expiredTime,
      user_id: "user-123",
    });

    const result = await verifyOtp(ctx, { code: "123456" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });

  it("returns error if code does not match", async () => {
    const ctx = createMockCtx(mockDb);
    const futureTime = new Date(Date.now() + 600000).toISOString(); // 10 minutes from now
    mockDb._statement.first.mockResolvedValueOnce({
      otp_code: "999999",
      otp_expires_at: futureTime,
      user_id: "user-123",
    });

    const result = await verifyOtp(ctx, { code: "111111" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid code/i);
  });

  it("verifies successfully with correct code, updates session in memory", async () => {
    const ctx = createMockCtx(mockDb);
    const futureTime = new Date(Date.now() + 600000).toISOString();
    mockDb._statement.first.mockResolvedValueOnce({
      otp_code: "654321",
      otp_expires_at: futureTime,
      user_id: "user-456",
    });
    mockDb._statement.run.mockResolvedValueOnce({ success: true });

    const result = await verifyOtp(ctx, { code: "654321" });

    expect(result.success).toBe(true);
    // In-memory session should be updated
    expect(ctx.session.is_verified).toBe(1);
    expect(ctx.session.user_id).toBe("user-456");
  });
});
