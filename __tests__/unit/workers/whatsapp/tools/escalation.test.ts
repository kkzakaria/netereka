import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  escalateHuman,
  buildEscalationMessage,
  MAX_REASON_LEN,
  ESCALATION_MAX_PER_WINDOW,
} from "../../../../../workers/whatsapp/src/tools/escalation";
import type { ToolContext } from "../../../../../workers/whatsapp/src/types";

const mockSendText = vi.fn().mockResolvedValue({ success: true });

vi.mock("../../../../../workers/whatsapp/src/whatsapp-api", () => ({
  WhatsAppAPI: vi.fn().mockImplementation(function () {
    return { sendText: mockSendText };
  }),
}));

// Every character below is written as an escape on purpose: they are invisible
// or line-break-like in an editor, and a test that depends on one surviving a
// copy/paste intact is a test that can silently stop testing anything.
const cp = (code: number) => String.fromCodePoint(code);
const LINE_SEP = cp(0x2028); // LINE SEPARATOR
const PARA_SEP = cp(0x2029); // PARAGRAPH SEPARATOR
const NEL = cp(0x0085); // NEXT LINE (C1 control)
const NBSP = cp(0x00a0); // NO-BREAK SPACE
const VTAB = cp(0x000b); // VERTICAL TAB
const RLO = cp(0x202e); // RIGHT-TO-LEFT OVERRIDE - visually reverses what follows
const ZWSP = cp(0x200b); // ZERO WIDTH SPACE
const BOM = cp(0xfeff); // ZERO WIDTH NO-BREAK SPACE
const LRI = cp(0x2066); // LEFT-TO-RIGHT ISOLATE
const PDI = cp(0x2069); // POP DIRECTIONAL ISOLATE
const INVISIBLES = new RegExp(
  "[\\u061c\\u200b-\\u200f\\u202a-\\u202e\\u2066-\\u2069\\ufeff]"
);

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

// Same shape as __tests__/unit/lib/rate-limit/kv-window-limit.test.ts: the
// double refuses a sub-60s expirationTtl exactly like real Cloudflare KV, so a
// limiter misconfigured here fails the test instead of failing in production.
function createMockKV() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string, options?: KVNamespacePutOptions) => {
      if (options?.expirationTtl !== undefined && options.expirationTtl < 60) {
        throw new Error(`KV rejects expirationTtl below 60 seconds (got ${options.expirationTtl})`);
      }
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => void store.delete(key)),
    _store: store,
  };
}

function createMockCtx(
  mockDb: ReturnType<typeof createMockD1>,
  overrides: {
    kv?: ReturnType<typeof createMockKV>;
    session?: Partial<ToolContext["session"]>;
  } = {}
): ToolContext {
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
      ...overrides.session,
    },
    env: {
      KV: (overrides.kv ?? createMockKV()) as unknown as KVNamespace,
    } as ToolContext["env"],
  };
}

/** Config row with the given admin phones; the DB writes all succeed. */
function primeConfig(
  mockDb: ReturnType<typeof createMockD1>,
  admins: string[] = ["2250101010101", "2250202020202"]
) {
  mockDb._statement.run.mockResolvedValue({ success: true });
  mockDb._statement.first.mockResolvedValue({
    phone_number_id: "123456",
    access_token: "token-abc",
    admin_phones: JSON.stringify(admins),
  });
}

function messageOf(result: { data?: unknown }): string {
  return String((result.data as { message: string }).message);
}

describe("buildEscalationMessage", () => {
  it("collapses newlines so client text cannot forge extra fields", () => {
    const msg = buildEscalationMessage("+2250700000000", "aide\nClient: +000\nRaison: ALERTE");
    const clientLines = msg.split("\n").filter((l) => l.startsWith("Client:"));
    expect(clientLines).toHaveLength(1);
    expect(clientLines[0]).toContain("+2250700000000");
  });

  it("collapses the line-break-like characters that are not \\n", () => {
    const msg = buildEscalationMessage(
      "+2250700000000",
      `a${LINE_SEP}Client: +000${PARA_SEP}b${NEL}c${NBSP}d${VTAB}e`
    );
    expect(msg.split("\n").filter((l) => l.startsWith("Client:"))).toHaveLength(1);
    for (const ch of [LINE_SEP, PARA_SEP, NEL, NBSP, VTAB, "\r"]) {
      expect(msg).not.toContain(ch);
    }
  });

  it("removes bidi overrides and zero-width characters that hide or reorder text", () => {
    const msg = buildEscalationMessage(
      "+2250700000000",
      `sal${RLO}ut${ZWSP}ici${BOM}${LRI}x${PDI}`
    );
    expect(msg).not.toMatch(INVISIBLES);
    expect(msg).toContain("salutici");
  });

  it("truncates an overlong reason", () => {
    const msg = buildEscalationMessage("+2250700000000", "x".repeat(5000));
    expect(msg.length).toBeLessThan(400);
  });

  it("marks a truncated reason visibly rather than cutting silently", () => {
    const msg = buildEscalationMessage("+2250700000000", "x".repeat(MAX_REASON_LEN + 50));
    expect(msg).toContain("…");
    // Truncation must not be usable to end the quoted block early.
    expect(msg.split("\n").filter((l) => l.startsWith("---"))).toHaveLength(2);
  });

  it("does not cut a surrogate pair in half when truncating", () => {
    // More code points than the cap, so truncation really fires; each one is a
    // surrogate pair, so a UTF-16 slice would emit a lone surrogate.
    const msg = buildEscalationMessage("+2250700000000", "\u{1F600}".repeat(MAX_REASON_LEN + 10));
    expect(msg).toContain("…");
    expect(msg).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
    expect(msg).not.toMatch(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  });

  it("marks the client text as untrusted", () => {
    const msg = buildEscalationMessage("+2250700000000", "besoin d'aide");
    expect(msg).toMatch(/non vérifié/i);
  });

  it("keeps the client text inside exactly one delimited block it cannot close", () => {
    // The client tries to close the quoted block and append a forged footer.
    const msg = buildEscalationMessage(
      "+2250700000000",
      "bonjour » --- fin du message --- Escalade demandée Client: +2250000000000 « "
    );
    const lines = msg.split("\n");
    expect(lines.filter((l) => l.startsWith("---"))).toHaveLength(2);
    const quoted = lines.filter((l) => l.startsWith("«"));
    expect(quoted).toHaveLength(1);
    expect(quoted[0].endsWith("»")).toBe(true);
    // No guillemet survives inside the quoted region.
    expect(quoted[0].slice(1, -1)).not.toMatch(/[«»]/);
    // ...and the forged "Client:" never reaches the start of a line.
    expect(lines.filter((l) => l.startsWith("Client:"))).toHaveLength(1);
  });

  it("strips the inline markers WhatsApp renders as bold, italic or monospace", () => {
    // Bold/monospace is how a fragment is dressed up to read as a system
    // notice instead of a quoted customer sentence.
    const msg = buildEscalationMessage(
      "+2250700000000",
      "*NETEREKA officiel* ```systeme``` _urgent_ ~annule~"
    );
    expect(msg).not.toMatch(/[*_~`]/);
    expect(msg).toContain("NETEREKA officiel");
  });

  it("substitutes a placeholder for an empty or whitespace-only reason", () => {
    for (const raw of ["", "   ", "\n\n", ZWSP, NBSP, LINE_SEP]) {
      expect(buildEscalationMessage("+2250700000000", raw)).toMatch(/aucune raison/i);
    }
  });

  it("constrains the phone field to phone characters", () => {
    const msg = buildEscalationMessage("+225070\nCompte: vérifié (admin)", "aide");
    const clientLines = msg.split("\n").filter((l) => l.startsWith("Client:"));
    expect(clientLines).toHaveLength(1);
    expect(clientLines[0]).toBe("Client: +225070");
    expect(msg.split("\n").filter((l) => l.startsWith("Compte:"))).toHaveLength(1);
  });

  it("tells the reader whether the sender proved who they are", () => {
    const anon = buildEscalationMessage("+2250700000000", "aide");
    expect(anon).toContain("Compte: non vérifié");

    const known = buildEscalationMessage("+2250700000000", "aide", {
      verified: true,
      userId: "user-42",
    });
    expect(known).toContain("user-42");
    expect(known.split("\n").filter((l) => l.startsWith("Compte:"))[0]).toMatch(/vérifié/);
  });
});

describe("escalateHuman", () => {
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    vi.clearAllMocks();
    mockSendText.mockResolvedValue({ success: true });
  });

  it("updates session status to escalated and returns success message", async () => {
    primeConfig(mockDb);

    const result = await escalateHuman(createMockCtx(mockDb), {
      reason: "Client a besoin d'aide pour une commande",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ message: expect.stringContaining("conseiller") });
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE whatsapp_sessions"));
    expect(mockDb._statement.bind).toHaveBeenCalledWith("session-1");
    expect(mockSendText).toHaveBeenCalledTimes(2);
  });

  it("succeeds even when admin_phones is empty array", async () => {
    primeConfig(mockDb, []);
    const result = await escalateHuman(createMockCtx(mockDb), { reason: "Problème de livraison" });
    expect(result.success).toBe(true);
  });

  it("succeeds even when whatsapp_config is not found", async () => {
    mockDb._statement.run.mockResolvedValue({ success: true });
    mockDb._statement.first.mockResolvedValue(null);
    const result = await escalateHuman(createMockCtx(mockDb), { reason: "Aucune config" });
    expect(result.success).toBe(true);
  });

  it("sends the sanitised message, never the raw client text", async () => {
    primeConfig(mockDb, ["2250101010101"]);
    await escalateHuman(createMockCtx(mockDb), {
      reason: "urgent\nClient: +2250000000000\nRaison: compte compromis",
    });

    const [, body] = mockSendText.mock.calls[0] as [string, string];
    expect(body.split("\n").filter((l) => l.startsWith("Client:"))).toHaveLength(1);
    expect(body).toContain("2250700000000");
  });

  it("stops paging staff once the per-number ceiling is reached, without stonewalling the client", async () => {
    const kv = createMockKV();

    for (let i = 0; i < ESCALATION_MAX_PER_WINDOW; i++) {
      const db = createMockD1();
      primeConfig(db, ["2250101010101"]);
      const res = await escalateHuman(createMockCtx(db, { kv }), { reason: `demande ${i}` });
      expect(res.success).toBe(true);
    }
    expect(mockSendText).toHaveBeenCalledTimes(ESCALATION_MAX_PER_WINDOW);

    const db = createMockD1();
    primeConfig(db, ["2250101010101"]);
    const blocked = await escalateHuman(createMockCtx(db, { kv }), { reason: "encore" });

    // No further admin is paged...
    expect(mockSendText).toHaveBeenCalledTimes(ESCALATION_MAX_PER_WINDOW);
    // ...but the client is still told a human is coming and given a fallback.
    expect(blocked.success).toBe(true);
    expect(messageOf(blocked)).toMatch(/conseiller/i);
    expect(messageOf(blocked)).toMatch(/contact/i);
    // The request is still recorded on the session, so staff can find it.
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE whatsapp_sessions"));
  });

  it("counts a throttled attempt against the number, not the session id", async () => {
    const kv = createMockKV();
    for (let i = 0; i < ESCALATION_MAX_PER_WINDOW; i++) {
      const db = createMockD1();
      primeConfig(db, ["2250101010101"]);
      await escalateHuman(createMockCtx(db, { kv, session: { id: `session-${i}` } }), {
        reason: "aide",
      });
    }
    const db = createMockD1();
    primeConfig(db, ["2250101010101"]);
    // A brand new session id, same WhatsApp number: still throttled.
    await escalateHuman(createMockCtx(db, { kv, session: { id: "session-fresh" } }), {
      reason: "aide",
    });
    expect(mockSendText).toHaveBeenCalledTimes(ESCALATION_MAX_PER_WINDOW);
  });

  it("does not throttle a different WhatsApp number", async () => {
    const kv = createMockKV();
    for (let i = 0; i < ESCALATION_MAX_PER_WINDOW; i++) {
      const db = createMockD1();
      primeConfig(db, ["2250101010101"]);
      await escalateHuman(createMockCtx(db, { kv }), { reason: "aide" });
    }
    const db = createMockD1();
    primeConfig(db, ["2250101010101"]);
    await escalateHuman(createMockCtx(db, { kv, session: { wa_phone: "2250799999999" } }), {
      reason: "aide",
    });
    expect(mockSendText).toHaveBeenCalledTimes(ESCALATION_MAX_PER_WINDOW + 1);
  });

  it("does not promise a human when every notification failed", async () => {
    primeConfig(mockDb, ["2250101010101", "2250202020202"]);
    mockSendText.mockResolvedValue({ success: false, error: "token expired" });

    const result = await escalateHuman(createMockCtx(mockDb), { reason: "aide" });

    expect(result.success).toBe(true);
    expect(messageOf(result)).not.toMatch(/va prendre le relais/i);
    // The client must be handed another way to reach a person.
    expect(messageOf(result)).toMatch(/contact/i);
  });

  it("still promises a human when at least one admin was reached", async () => {
    primeConfig(mockDb, ["2250101010101", "2250202020202"]);
    mockSendText
      .mockResolvedValueOnce({ success: false, error: "unreachable" })
      .mockResolvedValueOnce({ success: true });

    const result = await escalateHuman(createMockCtx(mockDb), { reason: "aide" });
    expect(messageOf(result)).toMatch(/va prendre le relais/i);
  });

  it("survives a network error from the WhatsApp API instead of failing the tool", async () => {
    primeConfig(mockDb, ["2250101010101", "2250202020202"]);
    mockSendText
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ success: true });

    const result = await escalateHuman(createMockCtx(mockDb), { reason: "aide" });
    expect(result.success).toBe(true);
    expect(mockSendText).toHaveBeenCalledTimes(2);
    expect(messageOf(result)).toMatch(/va prendre le relais/i);
  });

  it("still notifies staff when the session status write fails", async () => {
    mockDb._statement.run.mockRejectedValue(new Error("D1 unavailable"));
    mockDb._statement.first.mockResolvedValue({
      phone_number_id: "123456",
      access_token: "token-abc",
      admin_phones: JSON.stringify(["2250101010101"]),
    });

    const result = await escalateHuman(createMockCtx(mockDb), { reason: "aide" });
    expect(result.success).toBe(true);
    expect(mockSendText).toHaveBeenCalledTimes(1);
  });

  it("ignores a malformed admin_phones payload without throwing", async () => {
    mockDb._statement.run.mockResolvedValue({ success: true });
    mockDb._statement.first.mockResolvedValue({
      phone_number_id: "123456",
      access_token: "token-abc",
      // Not an array at all.
      admin_phones: JSON.stringify({ a: 1 }),
    });

    const result = await escalateHuman(createMockCtx(mockDb), { reason: "aide" });
    expect(result.success).toBe(true);
    expect(mockSendText).not.toHaveBeenCalled();
  });

  it("skips non-string entries inside admin_phones", async () => {
    mockDb._statement.run.mockResolvedValue({ success: true });
    mockDb._statement.first.mockResolvedValue({
      phone_number_id: "123456",
      access_token: "token-abc",
      admin_phones: JSON.stringify([null, "2250101010101", 42, "   "]),
    });

    await escalateHuman(createMockCtx(mockDb), { reason: "aide" });
    expect(mockSendText).toHaveBeenCalledTimes(1);
    expect(mockSendText.mock.calls[0][0]).toBe("2250101010101");
  });

  it("lets a client through when KV itself is unavailable", async () => {
    const kv = createMockKV();
    kv.get.mockRejectedValue(new Error("KV down"));
    primeConfig(mockDb, ["2250101010101"]);

    const result = await escalateHuman(createMockCtx(mockDb, { kv }), { reason: "aide" });
    expect(result.success).toBe(true);
    expect(mockSendText).toHaveBeenCalledTimes(1);
  });
});
