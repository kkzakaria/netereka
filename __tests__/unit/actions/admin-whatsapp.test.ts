import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockAdminSession, mockCustomerSession } from "../../helpers/mocks";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string): never => {
    const error = new Error(`NEXT_REDIRECT: ${url}`) as Error & { digest: string };
    error.digest = `NEXT_REDIRECT;${url}`;
    throw error;
  }),
  dbPrepare: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  initAuth: vi.fn().mockResolvedValue({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/lib/cloudflare/context", () => ({
  getDB: vi.fn().mockImplementation(() => Promise.resolve({ prepare: mocks.dbPrepare })),
}));

import { saveWhatsAppConfig } from "@/actions/admin/whatsapp";
import type { WhatsAppConfigInput } from "@/lib/validations/whatsapp-config";

// ─── D1 mock ────────────────────────────────────────────────────────────────

interface DbCall {
  sql: string;
  bindings: unknown[];
}

interface ExistingRow {
  id: number;
  access_token: string | null;
  webhook_secret: string | null;
}

/**
 * Stubs `db.prepare(...)`:
 *  - the SELECT (no .bind(), read via .first()) returns `existing`
 *  - the UPDATE/INSERT (.bind(...).run()) records sql + bindings and reports `changes`
 */
function setupDb(existing: ExistingRow | null, changes = 1): DbCall[] {
  const calls: DbCall[] = [];
  mocks.dbPrepare.mockImplementation((sql: string) => ({
    first: () => {
      calls.push({ sql, bindings: [] });
      return Promise.resolve(existing ?? undefined);
    },
    run: () => {
      calls.push({ sql, bindings: [] });
      return Promise.resolve({ meta: { changes } });
    },
    bind: (...bindings: unknown[]) => ({
      run: () => {
        calls.push({ sql, bindings });
        return Promise.resolve({ meta: { changes } });
      },
      first: () => {
        calls.push({ sql, bindings });
        return Promise.resolve(existing ?? undefined);
      },
    }),
  }));
  return calls;
}

const writeCall = (calls: DbCall[]) =>
  calls.find((c) => /^\s*(UPDATE|INSERT)/i.test(c.sql));

function input(overrides: Partial<WhatsAppConfigInput> = {}): WhatsAppConfigInput {
  return {
    display_phone_number: "",
    phone_number_id: "",
    business_account_id: "",
    access_token: "",
    verify_token: "",
    webhook_secret: "",
    admin_phones: "[]",
    is_active: false,
    ...overrides,
  };
}

const STORED_ACCESS_TOKEN = "EAAsecretaccesstoken1234";
const STORED_WEBHOOK_SECRET = "hmac-webhook-secret-5678";
// Masks getWhatsAppConfig() would have sent to the client for the values above.
const ACCESS_TOKEN_MASK = "••••••••1234";
const WEBHOOK_SECRET_MASK = "••••••••5678";

const existingRow: ExistingRow = {
  id: 1,
  access_token: STORED_ACCESS_TOKEN,
  webhook_secret: STORED_WEBHOOK_SECRET,
};

const activeApiFields = {
  phone_number_id: "123456789012345",
  business_account_id: "987654321098765",
  verify_token: "verify-token",
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("saveWhatsAppConfig — garde admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("redirige si l'appelant n'est pas admin", async () => {
    mocks.getSession.mockResolvedValue(mockCustomerSession);
    await expect(saveWhatsAppConfig(input())).rejects.toThrow(/NEXT_REDIRECT/);
  });
});

describe("saveWhatsAppConfig — config à deux étages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("accepte le numéro public seul avec is_active=0 (boutons wa.me sans bot)", async () => {
    const calls = setupDb(null);

    const result = await saveWhatsAppConfig(
      input({ display_phone_number: "+225 07 00 00 00 01" })
    );

    expect(result.success).toBe(true);
    const write = writeCall(calls);
    expect(write?.sql).toMatch(/^INSERT/i);
    // Numéro normalisé (chiffres uniquement) écrit en base, bot inactif.
    expect(write?.bindings).toContain("2250700000001");
    expect(write?.bindings).toContain(0);
  });

  it("refuse is_active=1 sans les champs API, erreurs ventilées par champ, sans écriture", async () => {
    const calls = setupDb(null);

    const result = await saveWhatsAppConfig(input({ is_active: true }));

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.phone_number_id?.[0]).toBeTruthy();
    expect(result.fieldErrors?.access_token?.[0]).toBeTruthy();
    expect(result.fieldErrors?.verify_token?.[0]).toBeTruthy();
    expect(result.fieldErrors?.webhook_secret?.[0]).toBeTruthy();
    expect(result.fieldErrors?.business_account_id?.[0]).toBeTruthy();
    expect(result.fieldErrors?.display_phone_number).toBeUndefined();
    expect(writeCall(calls)).toBeUndefined();
  });

  it("ventile l'erreur de format du numéro public sur display_phone_number", async () => {
    const calls = setupDb(null);

    const result = await saveWhatsAppConfig(input({ display_phone_number: "12345" }));

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.display_phone_number?.[0]).toContain("8 et 15 chiffres");
    expect(writeCall(calls)).toBeUndefined();
  });

  it("ventile l'erreur admin_phones sur admin_phones", async () => {
    const calls = setupDb(null);

    const result = await saveWhatsAppConfig(input({ admin_phones: "{}" }));

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.admin_phones?.[0]).toBe(
      "admin_phones doit être un tableau JSON valide."
    );
    expect(writeCall(calls)).toBeUndefined();
  });

  it("active le bot quand les 5 champs API sont fournis", async () => {
    const calls = setupDb(existingRow);

    const result = await saveWhatsAppConfig(
      input({
        ...activeApiFields,
        access_token: "EAAnewtoken",
        webhook_secret: "new-hmac",
        is_active: true,
      })
    );

    expect(result.success).toBe(true);
    const write = writeCall(calls);
    expect(write?.bindings).toContain("EAAnewtoken");
    expect(write?.bindings).toContain("new-hmac");
    expect(write?.bindings).toContain(1);
  });
});

describe("saveWhatsAppConfig — masquage des secrets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(mockAdminSession);
  });

  it("reconnaît le masque EXACT comme « inchangé » et préserve les secrets stockés", async () => {
    const calls = setupDb(existingRow);

    const result = await saveWhatsAppConfig(
      input({
        ...activeApiFields,
        access_token: ACCESS_TOKEN_MASK,
        webhook_secret: WEBHOOK_SECRET_MASK,
        is_active: true,
      })
    );

    expect(result.success).toBe(true);
    const write = writeCall(calls);
    // Les colonnes masquées ne sont pas réécrites → la valeur en base survit.
    expect(write?.sql).not.toMatch(/access_token = \?/);
    expect(write?.sql).not.toMatch(/webhook_secret = \?/);
    expect(write?.bindings).not.toContain(ACCESS_TOKEN_MASK);
    expect(write?.bindings).not.toContain(WEBHOOK_SECRET_MASK);
  });

  it("enregistre un secret RÉEL commençant par des puces (pas de startsWith(\"••\"))", async () => {
    const calls = setupDb(existingRow);

    // Même forme que le masque, mais 4 derniers caractères différents :
    // c'est un vrai secret saisi par l'admin, il doit être écrit.
    const realSecret = "••••••••9999";
    const result = await saveWhatsAppConfig(
      input({
        ...activeApiFields,
        access_token: realSecret,
        webhook_secret: "••hmac-réel",
        is_active: true,
      })
    );

    expect(result.success).toBe(true);
    const write = writeCall(calls);
    expect(write?.sql).toMatch(/access_token = \?/);
    expect(write?.sql).toMatch(/webhook_secret = \?/);
    expect(write?.bindings).toContain(realSecret);
    expect(write?.bindings).toContain("••hmac-réel");
  });

  it("ne confond pas le masque avec une valeur quand rien n'est stocké", async () => {
    // Aucun secret en base → aucun masque n'a pu être envoyé au client :
    // la saisie est prise au pied de la lettre.
    const calls = setupDb({ id: 1, access_token: null, webhook_secret: null });

    const result = await saveWhatsAppConfig(
      input({
        ...activeApiFields,
        access_token: ACCESS_TOKEN_MASK,
        webhook_secret: WEBHOOK_SECRET_MASK,
        is_active: true,
      })
    );

    expect(result.success).toBe(true);
    const write = writeCall(calls);
    expect(write?.bindings).toContain(ACCESS_TOKEN_MASK);
    expect(write?.bindings).toContain(WEBHOOK_SECRET_MASK);
  });

  it("garde atomique : échoue si les identifiants masqués ont disparu entre-temps", async () => {
    // changes = 0 → le WHERE ... IS NOT NULL n'a matché aucune ligne.
    const calls = setupDb(existingRow, 0);

    const result = await saveWhatsAppConfig(
      input({
        ...activeApiFields,
        access_token: ACCESS_TOKEN_MASK,
        webhook_secret: WEBHOOK_SECRET_MASK,
        is_active: true,
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("modifiés entre-temps");
    expect(writeCall(calls)?.sql).toMatch(/access_token IS NOT NULL/);
    expect(writeCall(calls)?.sql).toMatch(/webhook_secret IS NOT NULL/);
  });

  it("efface un secret quand le champ est vidé (bot inactif)", async () => {
    const calls = setupDb(existingRow);

    const result = await saveWhatsAppConfig(
      input({ display_phone_number: "2250700000001", access_token: "" })
    );

    expect(result.success).toBe(true);
    const write = writeCall(calls);
    expect(write?.sql).toMatch(/access_token = \?/);
    expect(write?.bindings).toContain(null);
  });
});
