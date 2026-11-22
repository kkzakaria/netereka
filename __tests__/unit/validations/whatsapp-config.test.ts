import { describe, it, expect } from "vitest";
import { whatsappConfigSchema } from "@/lib/validations/whatsapp-config";

// Base payload: every field present and empty, bot off.
// Mirrors what the form submits when nothing has been filled in.
function base(overrides: Record<string, unknown> = {}) {
  return {
    display_phone_number: "",
    phone_number_id: "",
    business_account_id: "",
    access_token: "",
    verify_token: "",
    webhook_secret: "",
    admin_phones: "",
    is_active: false,
    ...overrides,
  };
}

function fieldErrors(input: Record<string, unknown>) {
  const parsed = whatsappConfigSchema.safeParse(input);
  if (parsed.success) return null;
  return parsed.error.flatten().fieldErrors;
}

describe("whatsappConfigSchema — numéro public (étage public)", () => {
  it("accepte le numéro public seul, bot inactif (config à deux étages)", () => {
    const parsed = whatsappConfigSchema.safeParse(
      base({ display_phone_number: "2250700000001" })
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.display_phone_number).toBe("2250700000001");
      expect(parsed.data.is_active).toBe(false);
    }
  });

  it("normalise le numéro public en ne gardant que les chiffres", () => {
    const parsed = whatsappConfigSchema.safeParse(
      base({ display_phone_number: " +225 07-00.00 00 01 " })
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.display_phone_number).toBe("2250700000001");
  });

  it("accepte un numéro public vide (aucun bouton wa.me)", () => {
    expect(whatsappConfigSchema.safeParse(base()).success).toBe(true);
  });

  it("rejette un numéro trop court, erreur ventilée sur display_phone_number", () => {
    const errors = fieldErrors(base({ display_phone_number: "1234567" }));
    expect(errors?.display_phone_number?.[0]).toContain("8 et 15 chiffres");
    expect(errors?.phone_number_id).toBeUndefined();
  });

  it("rejette un numéro trop long (> 15 chiffres, E.164)", () => {
    const errors = fieldErrors(base({ display_phone_number: "1234567890123456" }));
    expect(errors?.display_phone_number?.[0]).toContain("8 et 15 chiffres");
  });
});

describe("whatsappConfigSchema — admin_phones", () => {
  it("normalise une valeur vide en tableau JSON vide", () => {
    const parsed = whatsappConfigSchema.safeParse(base({ admin_phones: "   " }));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.admin_phones).toBe("[]");
  });

  it("ré-encode un tableau JSON valide", () => {
    const parsed = whatsappConfigSchema.safeParse(
      base({ admin_phones: '[ "2250700000001" , "2250700000002" ]' })
    );
    expect(parsed.success).toBe(true);
    if (parsed.success)
      expect(parsed.data.admin_phones).toBe('["2250700000001","2250700000002"]');
  });

  it("rejette un JSON qui n'est pas un tableau, ventilé sur admin_phones", () => {
    const errors = fieldErrors(base({ admin_phones: '{"a":1}' }));
    expect(errors?.admin_phones?.[0]).toBe("admin_phones doit être un tableau JSON valide.");
  });

  it("rejette un JSON malformé, ventilé sur admin_phones", () => {
    const errors = fieldErrors(base({ admin_phones: "pas du json" }));
    expect(errors?.admin_phones?.[0]).toBe("admin_phones doit être un tableau JSON valide.");
  });
});

describe("whatsappConfigSchema — activation du bot (étage API)", () => {
  const fullApi = {
    phone_number_id: "123456789012345",
    business_account_id: "987654321098765",
    access_token: "EAAtoken",
    verify_token: "verify",
    webhook_secret: "secret",
  };

  it("refuse is_active=1 sans les champs API, avec une erreur sur CHAQUE champ manquant", () => {
    const errors = fieldErrors(base({ is_active: true }));
    expect(errors?.phone_number_id?.[0]).toBeTruthy();
    expect(errors?.business_account_id?.[0]).toBeTruthy();
    expect(errors?.access_token?.[0]).toBeTruthy();
    expect(errors?.verify_token?.[0]).toBeTruthy();
    expect(errors?.webhook_secret?.[0]).toBeTruthy();
    // Le numéro public n'est PAS requis pour activer le bot.
    expect(errors?.display_phone_number).toBeUndefined();
  });

  it("ne ventile que le champ API réellement manquant", () => {
    const errors = fieldErrors(base({ is_active: true, ...fullApi, webhook_secret: "" }));
    expect(errors?.webhook_secret?.[0]).toBeTruthy();
    expect(errors?.phone_number_id).toBeUndefined();
    expect(errors?.access_token).toBeUndefined();
    expect(errors?.verify_token).toBeUndefined();
    expect(errors?.business_account_id).toBeUndefined();
  });

  it("accepte is_active=1 avec les 5 champs API, sans numéro public", () => {
    const parsed = whatsappConfigSchema.safeParse(base({ is_active: true, ...fullApi }));
    expect(parsed.success).toBe(true);
  });

  it("n'exige aucun champ API quand is_active=0", () => {
    expect(whatsappConfigSchema.safeParse(base({ is_active: false })).success).toBe(true);
  });
});

describe("whatsappConfigSchema — secrets", () => {
  it("laisse passer un secret réel qui commence par des puces (pas de rejet de forme)", () => {
    const parsed = whatsappConfigSchema.safeParse(
      base({ access_token: "••••••••wxyz", webhook_secret: "••hmac-réel" })
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.access_token).toBe("••••••••wxyz");
      expect(parsed.data.webhook_secret).toBe("••hmac-réel");
    }
  });
});
