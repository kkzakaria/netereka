import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireActiveCustomer,
  readAccountState,
  ACCOUNT_SUSPENDED,
  ACCOUNT_UNKNOWN,
  ACCOUNT_STATE_UNAVAILABLE,
} from "../../../../../workers/whatsapp/src/tools/guards";
import type { ToolContext } from "../../../../../workers/whatsapp/src/types";

const NOT_LINKED = "not linked, please link your account.";

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
      user_id: "user-1",
      pending_user_id: null,
      is_verified: 1,
      otp_code: null,
      otp_expires_at: null,
      status: "active" as const,
      created_at: "",
      updated_at: "",
      ...sessionOverrides,
    } as ToolContext["session"],
    env: {
      DB: mockDb as unknown as D1Database,
      KV: {} as KVNamespace,
      AI: {} as Ai,
    },
  };
}

describe("requireActiveCustomer", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    vi.clearAllMocks();
  });

  it("refuses an unverified session without touching the database", async () => {
    const ctx = createMockCtx(mockDb, { is_verified: 0, user_id: "user-1" });

    const result = await requireActiveCustomer(ctx, NOT_LINKED);

    expect(result).toEqual({ ok: false, error: NOT_LINKED });
    // An unverified session proves nothing about *which* account is speaking,
    // so there is no account whose ban could be read. It is refused as
    // unlinked, exactly as before this guard existed.
    expect(mockDb.prepare).not.toHaveBeenCalled();
  });

  it("refuses a verified session that carries no user id, without a read", async () => {
    const ctx = createMockCtx(mockDb, { is_verified: 1, user_id: null });

    const result = await requireActiveCustomer(ctx, NOT_LINKED);

    expect(result).toEqual({ ok: false, error: NOT_LINKED });
    expect(mockDb.prepare).not.toHaveBeenCalled();
  });

  it("lets an active account through and hands back its id", async () => {
    const ctx = createMockCtx(mockDb);
    mockDb._statement.first.mockResolvedValueOnce({ banned: 0, banExpires: null });

    const result = await requireActiveCustomer(ctx, NOT_LINKED);

    expect(result).toEqual({ ok: true, userId: "user-1" });
  });

  it("reads the ban from the user table by id, not from the WhatsApp session", async () => {
    const ctx = createMockCtx(mockDb);
    mockDb._statement.first.mockResolvedValueOnce({ banned: 0, banExpires: null });

    await requireActiveCustomer(ctx, NOT_LINKED);

    const sql = mockDb.prepare.mock.calls[0][0] as string;
    expect(sql).toMatch(/FROM\s+user\b/i);
    expect(sql).toMatch(/banned/);
    expect(sql).toMatch(/banExpires/);
    expect(mockDb._statement.bind).toHaveBeenCalledWith("user-1");
  });

  it("refuses a permanently banned account", async () => {
    const ctx = createMockCtx(mockDb);
    mockDb._statement.first.mockResolvedValueOnce({ banned: 1, banExpires: null });

    const result = await requireActiveCustomer(ctx, NOT_LINKED);

    expect(result).toEqual({ ok: false, error: ACCOUNT_SUSPENDED });
  });

  it("refuses an account whose ban has not expired yet", async () => {
    const ctx = createMockCtx(mockDb);
    mockDb._statement.first.mockResolvedValueOnce({
      banned: 1,
      banExpires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    const result = await requireActiveCustomer(ctx, NOT_LINKED);

    expect(result).toEqual({ ok: false, error: ACCOUNT_SUSPENDED });
  });

  // The other direction, and the one a hand-rolled `if (banned)` would get
  // wrong: better-auth leaves banned = 1 on the row once the sanction lapses,
  // so a served-out ban must not lock the customer out of the bot for good.
  it("lets an account through once its ban has expired", async () => {
    const ctx = createMockCtx(mockDb);
    mockDb._statement.first.mockResolvedValueOnce({
      banned: 1,
      banExpires: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });

    const result = await requireActiveCustomer(ctx, NOT_LINKED);

    expect(result).toEqual({ ok: true, userId: "user-1" });
  });

  it("refuses when the linked account no longer exists", async () => {
    const ctx = createMockCtx(mockDb);
    mockDb._statement.first.mockResolvedValueOnce(null);

    const result = await requireActiveCustomer(ctx, NOT_LINKED);

    expect(result).toEqual({ ok: false, error: ACCOUNT_UNKNOWN });
  });

  it("refuses rather than proceeds when the ban read itself fails", async () => {
    const ctx = createMockCtx(mockDb);
    mockDb._statement.first.mockRejectedValueOnce(new Error("D1 unavailable"));

    const result = await requireActiveCustomer(ctx, NOT_LINKED);

    expect(result).toEqual({ ok: false, error: ACCOUNT_STATE_UNAVAILABLE });
  });

  // The point of the whole exercise: a session linked before the ban must not
  // stay usable. Nothing may be cached between calls.
  it("re-reads the ban on every call", async () => {
    const ctx = createMockCtx(mockDb);
    mockDb._statement.first
      .mockResolvedValueOnce({ banned: 0, banExpires: null })
      .mockResolvedValueOnce({ banned: 1, banExpires: null });

    expect(await requireActiveCustomer(ctx, NOT_LINKED)).toEqual({ ok: true, userId: "user-1" });
    expect(await requireActiveCustomer(ctx, NOT_LINKED)).toEqual({
      ok: false,
      error: ACCOUNT_SUSPENDED,
    });
    expect(mockDb._statement.first).toHaveBeenCalledTimes(2);
  });
});

describe("readAccountState", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    vi.clearAllMocks();
  });

  it("reports active, banned, unknown and unavailable", async () => {
    const db = mockDb as unknown as D1Database;

    mockDb._statement.first.mockResolvedValueOnce({ banned: 0, banExpires: null });
    expect(await readAccountState(db, "user-1")).toBe("active");

    mockDb._statement.first.mockResolvedValueOnce({ banned: 1, banExpires: null });
    expect(await readAccountState(db, "user-1")).toBe("banned");

    mockDb._statement.first.mockResolvedValueOnce(null);
    expect(await readAccountState(db, "user-1")).toBe("unknown");

    mockDb._statement.first.mockRejectedValueOnce(new Error("boom"));
    expect(await readAccountState(db, "user-1")).toBe("unavailable");
  });
});
