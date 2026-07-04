import { describe, it, expect, vi, beforeEach } from "vitest";
import { findOrCreateSession } from "../../../../workers/whatsapp/src/session";

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

describe("findOrCreateSession", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
  });

  it("returns existing session if found", async () => {
    const existingSession = {
      id: "sess_123",
      wa_phone: "2250700000000",
      user_id: "usr_1",
      is_verified: 1,
      status: "active",
      created_at: "2026-04-13T10:00:00Z",
      updated_at: "2026-04-13T10:00:00Z",
    };
    mockDb._statement.first.mockResolvedValueOnce(existingSession);

    const session = await findOrCreateSession(mockDb as unknown as D1Database, "2250700000000");

    expect(session).toEqual(existingSession);
    expect(mockDb.prepare).toHaveBeenCalledTimes(1);
  });

  // Security regression (GHSA-4v42): a new session must NEVER be auto-linked or
  // auto-verified from a user.phone match — phone is a self-asserted, unverified
  // signup field. Linking must go through the email-OTP flow instead.
  it("creates an unlinked, unverified session even when a phone would match", async () => {
    mockDb._statement.first.mockResolvedValueOnce(null); // no existing session
    mockDb._statement.run.mockResolvedValueOnce({ success: true }); // INSERT
    mockDb._statement.first.mockResolvedValueOnce({
      id: "new_sess",
      wa_phone: "2250700000000",
      user_id: null,
      pending_user_id: null,
      is_verified: 0,
      status: "active",
      created_at: "2026-04-13T10:00:00Z",
      updated_at: "2026-04-13T10:00:00Z",
    });

    const session = await findOrCreateSession(mockDb as unknown as D1Database, "2250700000000");

    expect(session.user_id).toBeNull();
    expect(session.is_verified).toBe(0);
    // It must not query the `user` table by phone at all.
    const phoneLookup = mockDb.prepare.mock.calls
      .map((c) => String(c[0]))
      .find((sql) => /FROM user\b/i.test(sql) && /phone/i.test(sql));
    expect(phoneLookup).toBeUndefined();
    // The INSERT must hard-code an unlinked/unverified row.
    const insertSql = mockDb.prepare.mock.calls
      .map((c) => String(c[0]))
      .find((sql) => sql.includes("INSERT OR IGNORE INTO whatsapp_sessions"));
    expect(insertSql).toContain("user_id, is_verified");
    expect(insertSql).toMatch(/VALUES\s*\(\?,\s*\?,\s*NULL,\s*0,/);
  });
});
