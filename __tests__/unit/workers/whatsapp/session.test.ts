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

  it("creates new session and auto-links if phone matches a user", async () => {
    mockDb._statement.first.mockResolvedValueOnce(null);
    mockDb._statement.first.mockResolvedValueOnce({ id: "usr_42" });
    mockDb._statement.run.mockResolvedValueOnce({ success: true });
    mockDb._statement.first.mockResolvedValueOnce({
      id: "new_sess",
      wa_phone: "2250700000000",
      user_id: "usr_42",
      is_verified: 1,
      status: "active",
      created_at: "2026-04-13T10:00:00Z",
      updated_at: "2026-04-13T10:00:00Z",
    });

    const session = await findOrCreateSession(mockDb as unknown as D1Database, "2250700000000");

    expect(session.user_id).toBe("usr_42");
    expect(session.is_verified).toBe(1);
  });

  it("creates unlinked session if no user matches", async () => {
    mockDb._statement.first.mockResolvedValueOnce(null);
    mockDb._statement.first.mockResolvedValueOnce(null);
    mockDb._statement.run.mockResolvedValueOnce({ success: true });
    mockDb._statement.first.mockResolvedValueOnce({
      id: "new_sess",
      wa_phone: "2250700000000",
      user_id: null,
      is_verified: 0,
      status: "active",
      created_at: "2026-04-13T10:00:00Z",
      updated_at: "2026-04-13T10:00:00Z",
    });

    const session = await findOrCreateSession(mockDb as unknown as D1Database, "2250700000000");

    expect(session.user_id).toBeNull();
    expect(session.is_verified).toBe(0);
  });
});
